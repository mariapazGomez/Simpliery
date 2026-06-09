# TypeScript MCP Server Implementation Guide

Complete guide for building MCP servers with the official TypeScript SDK.

---

## Project Structure

```
my-mcp-server/
├── src/
│   ├── index.ts          # Server entry point
│   ├── tools/
│   │   ├── index.ts      # Tool registration barrel
│   │   ├── items.ts      # Domain-specific tools
│   │   └── auth.ts       # Auth helpers
│   └── client.ts         # API client wrapper
├── package.json
├── tsconfig.json
└── README.md
```

---

## package.json

```json
{
  "name": "my-mcp-server",
  "version": "1.0.0",
  "type": "module",
  "main": "dist/index.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/index.js",
    "dev": "tsx src/index.ts",
    "inspect": "npx @modelcontextprotocol/inspector node dist/index.js"
  },
  "dependencies": {
    "@modelcontextprotocol/sdk": "^1.0.0",
    "zod": "^3.22.0"
  },
  "devDependencies": {
    "typescript": "^5.3.0",
    "tsx": "^4.6.0",
    "@types/node": "^20.0.0"
  }
}
```

---

## tsconfig.json

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": ["src/**/*"]
}
```

---

## Server Entry Point (src/index.ts)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { registerTools } from "./tools/index.js";

const server = new McpServer({
  name: "my-service",
  version: "1.0.0",
});

registerTools(server);

const transport = new StdioServerTransport();
await server.connect(transport);
```

**For HTTP transport:**
```typescript
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import express from "express";

const app = express();
app.use(express.json());

app.post("/mcp", async (req, res) => {
  const transport = new StreamableHTTPServerTransport({ sessionIdGenerator: undefined });
  await server.connect(transport);
  await transport.handleRequest(req, res, req.body);
});

app.listen(3000);
```

---

## Tool Registration (src/tools/items.ts)

```typescript
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";

export function registerItemTools(server: McpServer) {
  server.registerTool(
    "service_list_items",
    {
      description: "List items with optional filtering. Returns id, name, status, and createdAt.",
      inputSchema: {
        status: z.enum(["active", "inactive", "all"]).default("all")
          .describe("Filter by item status"),
        limit: z.number().int().min(1).max(100).default(20)
          .describe("Maximum number of items to return"),
        cursor: z.string().optional()
          .describe("Pagination cursor from previous response"),
      },
      annotations: {
        readOnlyHint: true,
        destructiveHint: false,
        idempotentHint: true,
        openWorldHint: false,
      },
    },
    async ({ status, limit, cursor }) => {
      try {
        const result = await apiClient.listItems({ status, limit, cursor });
        return {
          structuredContent: result,
          content: [{ type: "text", text: JSON.stringify(result, null, 2) }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error listing items: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );

  server.registerTool(
    "service_create_item",
    {
      description: "Create a new item. Returns the created item with its assigned id.",
      inputSchema: {
        name: z.string().min(1).max(255).describe("Item name"),
        description: z.string().max(1000).optional().describe("Optional description"),
        tags: z.array(z.string()).max(10).optional().describe("Up to 10 tags"),
      },
      annotations: {
        readOnlyHint: false,
        destructiveHint: false,
        idempotentHint: false,
        openWorldHint: false,
      },
    },
    async ({ name, description, tags }) => {
      try {
        const item = await apiClient.createItem({ name, description, tags });
        return {
          structuredContent: item,
          content: [{ type: "text", text: `Created item: ${item.id}\n${JSON.stringify(item, null, 2)}` }],
        };
      } catch (error) {
        return {
          isError: true,
          content: [{ type: "text", text: `Error creating item: ${error instanceof Error ? error.message : String(error)}` }],
        };
      }
    }
  );
}
```

---

## API Client Pattern (src/client.ts)

```typescript
const BASE_URL = process.env.API_BASE_URL ?? "https://api.example.com";
const API_KEY = process.env.API_KEY;

if (!API_KEY) throw new Error("API_KEY environment variable is required");

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...options,
    headers: {
      "Authorization": `Bearer ${API_KEY}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }

  return response.json() as Promise<T>;
}

export const apiClient = {
  listItems: (params: ListParams) =>
    request<ListResponse>(`/items?${new URLSearchParams(params as any)}`),
  createItem: (body: CreateParams) =>
    request<Item>("/items", { method: "POST", body: JSON.stringify(body) }),
};
```

---

## Quality Checklist

Before shipping:

- [ ] All tools have clear, concise descriptions
- [ ] All input fields have `describe()` annotations
- [ ] All tools return structured errors with `isError: true`
- [ ] Pagination supported on all list endpoints
- [ ] `npm run build` passes with zero errors
- [ ] Tested with MCP Inspector (`npm run inspect`)
- [ ] API key loaded from environment, never hardcoded
- [ ] Tool annotations (`readOnlyHint`, etc.) set correctly

---

## Testing with MCP Inspector

```bash
npm run build
npx @modelcontextprotocol/inspector node dist/index.js
```

Open the Inspector UI, select your server, and test each tool manually.
