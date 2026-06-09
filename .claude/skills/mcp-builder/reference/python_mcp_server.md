# Python MCP Server Implementation Guide

Complete guide for building MCP servers with FastMCP (Python SDK).

---

## Project Structure

```
my_mcp_server/
├── src/
│   └── my_mcp_server/
│       ├── __init__.py
│       ├── server.py       # FastMCP server & tool registration
│       ├── client.py       # API client wrapper
│       └── models.py       # Pydantic models
├── pyproject.toml
└── README.md
```

---

## pyproject.toml

```toml
[project]
name = "my-mcp-server"
version = "1.0.0"
requires-python = ">=3.10"
dependencies = [
    "mcp[cli]>=1.0.0",
    "httpx>=0.27.0",
    "pydantic>=2.0.0",
]

[project.scripts]
my-mcp-server = "my_mcp_server.server:main"

[build-system]
requires = ["hatchling"]
build-backend = "hatchling.build"
```

Install:
```bash
pip install -e .
# or
uv sync
```

---

## Server Entry Point (src/my_mcp_server/server.py)

```python
import os
from mcp.server.fastmcp import FastMCP
from .client import APIClient

mcp = FastMCP("my-service")
client = APIClient(api_key=os.environ["API_KEY"])


@mcp.tool()
async def service_list_items(
    status: str = "all",
    limit: int = 20,
    cursor: str | None = None,
) -> dict:
    """List items with optional filtering.

    Args:
        status: Filter by status — 'active', 'inactive', or 'all'
        limit: Maximum items to return (1–100)
        cursor: Pagination cursor from previous response

    Returns:
        items: List of item objects with id, name, status, createdAt
        nextCursor: Cursor for next page, or null if no more results
    """
    return await client.list_items(status=status, limit=limit, cursor=cursor)


@mcp.tool()
async def service_create_item(
    name: str,
    description: str | None = None,
    tags: list[str] | None = None,
) -> dict:
    """Create a new item.

    Args:
        name: Item name (required, max 255 chars)
        description: Optional description (max 1000 chars)
        tags: Optional list of tags (max 10)

    Returns:
        Created item object with assigned id
    """
    if len(name) > 255:
        raise ValueError("name must be 255 characters or fewer")
    if tags and len(tags) > 10:
        raise ValueError("Maximum 10 tags allowed")

    return await client.create_item(name=name, description=description, tags=tags)


def main():
    mcp.run()


if __name__ == "__main__":
    main()
```

---

## Pydantic Models (src/my_mcp_server/models.py)

```python
from pydantic import BaseModel, Field
from datetime import datetime


class Item(BaseModel):
    id: str
    name: str = Field(max_length=255)
    description: str | None = Field(default=None, max_length=1000)
    status: str
    tags: list[str] = Field(default_factory=list)
    created_at: datetime


class ListResponse(BaseModel):
    items: list[Item]
    next_cursor: str | None = None
    total: int | None = None
```

---

## API Client Pattern (src/my_mcp_server/client.py)

```python
import httpx
from .models import Item, ListResponse

BASE_URL = "https://api.example.com"


class APIClient:
    def __init__(self, api_key: str):
        self._client = httpx.AsyncClient(
            base_url=BASE_URL,
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=30.0,
        )

    async def list_items(self, *, status: str, limit: int, cursor: str | None) -> dict:
        params = {"status": status, "limit": limit}
        if cursor:
            params["cursor"] = cursor
        response = await self._client.get("/items", params=params)
        response.raise_for_status()
        return response.json()

    async def create_item(self, *, name: str, description: str | None, tags: list[str] | None) -> dict:
        body = {"name": name}
        if description is not None:
            body["description"] = description
        if tags is not None:
            body["tags"] = tags
        response = await self._client.post("/items", json=body)
        response.raise_for_status()
        return response.json()

    async def __aenter__(self):
        return self

    async def __aexit__(self, *args):
        await self._client.aclose()
```

---

## Running the Server

```bash
# stdio (for local MCP clients)
python -m my_mcp_server.server

# or via entry point
my-mcp-server

# Test with MCP Inspector
npx @modelcontextprotocol/inspector python -m my_mcp_server.server
```

---

## Quality Checklist

Before shipping:

- [ ] All tools have docstrings with Args and Returns sections
- [ ] Input validation uses Pydantic or explicit checks
- [ ] Errors raise `ValueError` or return helpful messages
- [ ] Pagination supported on all list endpoints
- [ ] `python -m py_compile` passes on all files
- [ ] API key loaded from environment, never hardcoded
- [ ] Tested with MCP Inspector
- [ ] `pyproject.toml` has correct dependencies and entry points
