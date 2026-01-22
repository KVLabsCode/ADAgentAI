FROM python:3.12-slim

WORKDIR /app

COPY backend/admob_mcp/ ./admob_mcp/
COPY backend/pyproject.toml ./

RUN pip install --no-cache-dir -e .

ENV TRANSPORT=http
ENV PORT=10000

EXPOSE 10000

CMD ["python", "-m", "admob_mcp.server"]
