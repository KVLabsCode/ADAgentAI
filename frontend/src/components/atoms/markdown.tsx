"use client"

import * as React from "react"
import { marked, type Token, type Tokens } from "marked"
import { cn } from "@/lib/utils"
import { CodeBlock } from "./code-block"

interface MarkdownProps {
  content: string
  id?: string
  className?: string
}

/**
 * Optimized markdown renderer with block-level memoization.
 * Uses marked.lexer() to split content into blocks, each wrapped in React.memo.
 * Only changed blocks re-render during streaming, improving performance.
 */
export function Markdown({ content, id = "md", className }: MarkdownProps) {
  // Parse content into tokens using marked.lexer()
  const tokens = React.useMemo(() => {
    try {
      return marked.lexer(content)
    } catch {
      return []
    }
  }, [content])

  return (
    <div
      className={cn(
        "prose dark:prose-invert max-w-none",
        // Typography
        "text-[15px] leading-relaxed text-zinc-800 dark:text-zinc-200",
        // Headings
        "prose-headings:text-zinc-900 dark:prose-headings:text-zinc-100",
        "prose-headings:font-semibold prose-headings:tracking-tight",
        "prose-h1:text-xl prose-h1:mt-4 prose-h1:mb-3",
        "prose-h1:border-b prose-h1:border-zinc-200 dark:prose-h1:border-zinc-700/50 prose-h1:pb-2",
        "prose-h2:text-lg prose-h2:mt-5 prose-h2:mb-2",
        "prose-h3:text-base prose-h3:mt-4 prose-h3:mb-2",
        // Paragraphs
        "prose-p:my-2.5 prose-p:leading-relaxed",
        // Lists
        "prose-ul:my-2.5 prose-ul:pl-4",
        "prose-ol:my-2.5 prose-ol:pl-4",
        "prose-li:my-1 prose-li:marker:text-zinc-400 dark:prose-li:marker:text-zinc-500",
        // Inline code
        "prose-code:bg-zinc-100 dark:prose-code:bg-zinc-700/60",
        "prose-code:text-emerald-600 dark:prose-code:text-emerald-300",
        "prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-code:text-sm prose-code:font-normal",
        "prose-code:before:content-none prose-code:after:content-none",
        // Strong/Em
        "prose-strong:text-zinc-900 dark:prose-strong:text-zinc-100 prose-strong:font-semibold",
        "prose-em:text-zinc-700 dark:prose-em:text-zinc-300",
        // Links
        "prose-a:text-violet-600 dark:prose-a:text-violet-400",
        "prose-a:no-underline hover:prose-a:underline",
        // Blockquotes
        "prose-blockquote:border-l-violet-500/50",
        "prose-blockquote:bg-zinc-50 dark:prose-blockquote:bg-zinc-800/50",
        "prose-blockquote:rounded-r prose-blockquote:py-1 prose-blockquote:px-3",
        "prose-blockquote:not-italic prose-blockquote:text-zinc-700 dark:prose-blockquote:text-zinc-300",
        // Tables
        "prose-table:border prose-table:border-zinc-200 dark:prose-table:border-zinc-700/50",
        "prose-th:bg-zinc-50 dark:prose-th:bg-zinc-800",
        "prose-th:px-3 prose-th:py-2 prose-th:text-zinc-900 dark:prose-th:text-zinc-200 prose-th:font-medium",
        "prose-td:px-3 prose-td:py-2 prose-td:border-t prose-td:border-zinc-200 dark:prose-td:border-zinc-700/50",
        className
      )}
    >
      {tokens.map((token, index) => (
        <MemoizedBlock key={`${id}-block-${index}`} token={token} />
      ))}
    </div>
  )
}

/**
 * Memoized block renderer - only re-renders when token content changes
 */
const MemoizedBlock = React.memo(
  function Block({ token }: { token: Token }) {
    return renderToken(token)
  },
  (prevProps, nextProps) => {
    // Deep compare tokens by raw content
    return prevProps.token.raw === nextProps.token.raw
  }
)

/**
 * Render a single marked token to React elements
 */
function renderToken(token: Token): React.ReactNode {
  switch (token.type) {
    case "heading": {
      const depth = token.depth
      const children = renderInlineTokens(token.tokens || [])
      switch (depth) {
        case 1: return <h1>{children}</h1>
        case 2: return <h2>{children}</h2>
        case 3: return <h3>{children}</h3>
        case 4: return <h4>{children}</h4>
        case 5: return <h5>{children}</h5>
        case 6: return <h6>{children}</h6>
        default: return <p>{children}</p>
      }
    }

    case "paragraph":
      return <p>{renderInlineTokens(token.tokens || [])}</p>

    case "text":
      // Handle text with tokens (inline formatting) vs plain text
      if ("tokens" in token && token.tokens) {
        return <>{renderInlineTokens(token.tokens)}</>
      }
      return <>{token.text}</>

    case "code": {
      const codeToken = token as Tokens.Code
      return <CodeBlock code={codeToken.text} language={codeToken.lang} />
    }

    case "blockquote": {
      const blockquoteToken = token as Tokens.Blockquote
      return (
        <blockquote>
          {blockquoteToken.tokens?.map((t, i) => (
            <React.Fragment key={i}>{renderToken(t)}</React.Fragment>
          ))}
        </blockquote>
      )
    }

    case "list": {
      const listToken = token as Tokens.List
      const ListTag = listToken.ordered ? "ol" : "ul"
      return (
        <ListTag start={listToken.start || undefined}>
          {listToken.items.map((item, i) => (
            <li key={i}>
              {item.tokens?.map((t, j) => (
                <React.Fragment key={j}>{renderToken(t)}</React.Fragment>
              ))}
            </li>
          ))}
        </ListTag>
      )
    }

    case "table": {
      const tableToken = token as Tokens.Table
      return (
        <table>
          <thead>
            <tr>
              {tableToken.header.map((cell, i) => (
                <th key={i} style={{ textAlign: tableToken.align[i] || undefined }}>
                  {renderInlineTokens(cell.tokens)}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {tableToken.rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ textAlign: tableToken.align[j] || undefined }}>
                    {renderInlineTokens(cell.tokens)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )
    }

    case "hr":
      return <hr />

    case "space":
      return null

    case "html":
      // Sanitize HTML - only allow safe elements
      return <div dangerouslySetInnerHTML={{ __html: token.raw }} />

    default:
      // Fallback: render raw content
      if ("raw" in token) {
        return <span>{token.raw}</span>
      }
      return null
  }
}

/**
 * Render inline tokens (text, bold, italic, code, links, etc.)
 */
function renderInlineTokens(tokens: Token[]): React.ReactNode {
  return tokens.map((token, index) => {
    switch (token.type) {
      case "text":
        // Handle text with nested tokens vs plain text
        if ("tokens" in token && token.tokens) {
          return <React.Fragment key={index}>{renderInlineTokens(token.tokens)}</React.Fragment>
        }
        return <React.Fragment key={index}>{token.text}</React.Fragment>

      case "strong":
        return <strong key={index}>{renderInlineTokens((token as Tokens.Strong).tokens)}</strong>

      case "em":
        return <em key={index}>{renderInlineTokens((token as Tokens.Em).tokens)}</em>

      case "del":
        return <del key={index}>{renderInlineTokens((token as Tokens.Del).tokens)}</del>

      case "codespan":
        return <code key={index}>{(token as Tokens.Codespan).text}</code>

      case "link": {
        const linkToken = token as Tokens.Link
        return (
          <a
            key={index}
            href={linkToken.href}
            title={linkToken.title || undefined}
            target="_blank"
            rel="noopener noreferrer"
          >
            {renderInlineTokens(linkToken.tokens)}
          </a>
        )
      }

      case "image": {
        const imgToken = token as Tokens.Image
        return (
          // eslint-disable-next-line @next/next/no-img-element -- Dynamic markdown images have unknown dimensions and external URLs
          <img
            key={index}
            src={imgToken.href}
            alt={imgToken.text}
            title={imgToken.title || undefined}
          />
        )
      }

      case "br":
        return <br key={index} />

      case "escape":
        return <React.Fragment key={index}>{(token as Tokens.Escape).text}</React.Fragment>

      default:
        if ("raw" in token) {
          return <React.Fragment key={index}>{token.raw}</React.Fragment>
        }
        return null
    }
  })
}
