"""Tool Retriever Node - Full-text search for relevant tools.

Uses PostgreSQL tsvector/tsquery to find tools matching user query.
No external API needed - all done in Neon.
"""

import os
import asyncio
from typing import Optional

from langsmith import traceable

from ..state import GraphState
from ...tools.registry import get_tool_registry, ToolConfig

DEFAULT_TOP_K = 15


def _get_db_connection():
    """Get sync database connection."""
    import psycopg
    database_url = os.getenv("DATABASE_URL")
    if not database_url:
        raise ValueError("DATABASE_URL not set")
    return psycopg.connect(database_url)


def _populate_tools_sync(tools: list[ToolConfig]) -> int:
    """Sync function to populate tools (runs in thread)."""
    conn = _get_db_connection()
    count = 0
    try:
        with conn.cursor() as cur:
            for tool in tools:
                cur.execute(
                    """
                    INSERT INTO tool_embeddings (tool_name, provider, description, category, is_dangerous, search_vector)
                    VALUES (%s, %s, %s, %s, %s, to_tsvector('english', %s || ' ' || %s))
                    ON CONFLICT (tool_name) DO UPDATE SET
                        provider = EXCLUDED.provider,
                        description = EXCLUDED.description,
                        category = EXCLUDED.category,
                        is_dangerous = EXCLUDED.is_dangerous,
                        search_vector = EXCLUDED.search_vector
                    """,
                    (
                        tool.name,
                        tool.provider,
                        tool.description,
                        tool.category.value if hasattr(tool.category, 'value') else str(tool.category),
                        tool.is_dangerous,
                        tool.name.replace('_', ' '),
                        tool.description,
                    )
                )
                count += 1
        conn.commit()
    finally:
        conn.close()
    return count


def _search_tools_sync(query: str, provider: Optional[str], top_k: int) -> list[str]:
    """Sync function to search tools (runs in thread)."""
    conn = _get_db_connection()
    results = []
    try:
        with conn.cursor() as cur:
            sql = """
                SELECT tool_name, ts_rank(search_vector, query) as rank
                FROM tool_embeddings, plainto_tsquery('english', %s) query
                WHERE search_vector @@ query
            """
            params: list = [query]

            if provider:
                sql += " AND provider = %s"
                params.append(provider)

            sql += " ORDER BY rank DESC LIMIT %s"
            params.append(top_k)

            cur.execute(sql, params)
            rows = cur.fetchall()
            results = [row[0] for row in rows]
    finally:
        conn.close()
    return results


async def populate_tools_from_registry() -> int:
    """Populate tool_embeddings table from registry."""
    registry = get_tool_registry()
    tools = registry.get_all_tools()

    if not tools:
        print("[tool_retriever] No tools in registry")
        return 0

    count = await asyncio.to_thread(_populate_tools_sync, tools)
    print(f"[tool_retriever] Populated {count} tools")
    return count


async def search_tools(
    query: str,
    provider: Optional[str] = None,
    top_k: int = DEFAULT_TOP_K,
) -> list[str]:
    """Search tools using full-text search."""
    return await asyncio.to_thread(_search_tools_sync, query, provider, top_k)


def _search_tools_within_set_sync(
    query: str,
    tool_names: list[str],
    top_k: int,
) -> list[str]:
    """Sync function to search within a specific set of tools (runs in thread)."""
    if not tool_names:
        return []

    conn = _get_db_connection()
    results = []
    try:
        with conn.cursor() as cur:
            # Use ANY to filter to specific tool names, then rank by FTS relevance
            placeholders = ",".join(["%s"] * len(tool_names))
            sql = f"""
                SELECT tool_name, ts_rank(search_vector, query) as rank
                FROM tool_embeddings, plainto_tsquery('english', %s) query
                WHERE tool_name IN ({placeholders})
                AND search_vector @@ query
                ORDER BY rank DESC
                LIMIT %s
            """
            params = [query] + tool_names + [top_k]
            cur.execute(sql, params)
            rows = cur.fetchall()
            results = [row[0] for row in rows]

            # If FTS returns fewer results than requested, include unmatched tools
            # (query might not have good FTS matches but tools are still relevant by tag)
            if len(results) < top_k:
                matched_set = set(results)
                for name in tool_names:
                    if name not in matched_set:
                        results.append(name)
                        if len(results) >= top_k:
                            break
    except Exception as e:
        print(f"[tool_retriever] FTS within set error: {e}")
        # On error, just return first top_k from input
        results = tool_names[:top_k]
    finally:
        conn.close()
    return results


async def search_tools_within_set(
    query: str,
    tool_names: list[str],
    top_k: int = DEFAULT_TOP_K,
) -> list[str]:
    """Search and rank tools within a specific set using full-text search.

    This is used for two-layer filtering:
    1. Tag filter narrows to network + capability tools
    2. FTS ranks those tools by query relevance

    Args:
        query: User query for relevance ranking
        tool_names: Pre-filtered tool names to search within
        top_k: Maximum tools to return

    Returns:
        Top K tool names ranked by relevance to query
    """
    if len(tool_names) <= top_k:
        # No need for FTS if already under threshold
        return tool_names

    print(f"[tool_retriever] FTS refinement: {len(tool_names)} tools -> top {top_k}")
    return await asyncio.to_thread(_search_tools_within_set_sync, query, tool_names, top_k)


@traceable(name="tool_retriever_node", run_type="chain")
async def tool_retriever_node(state: GraphState) -> dict:
    """Retrieve relevant tools based on user query."""
    user_query = state.get("user_query", "")
    routing = state.get("routing", {})

    service = routing.get("service", "general")
    capability = routing.get("capability", "")

    search_query = user_query
    if capability and capability != "assistant":
        search_query = f"{capability} {user_query}"

    print(f"[tool_retriever] Query: {search_query[:80]}...")

    provider = None if service in ("general", "all") else service

    try:
        tool_names = await search_tools(search_query, provider, DEFAULT_TOP_K)
        print(f"[tool_retriever] Found {len(tool_names)} tools")
        return {"retrieved_tools": tool_names}
    except Exception as e:
        print(f"[tool_retriever] Error: {e}")
        return {"retrieved_tools": []}
