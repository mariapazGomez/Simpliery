# MCP Best Practices

Universal guidelines for building high-quality MCP servers.

---

## Server Naming

- Use lowercase kebab-case: `my-service-name`
- Be specific and descriptive: `github-issues` not `github`
- Avoid generic names like `api-server` or `tools`

---

## Tool Naming

- Use `{service}_{action}_{object}` pattern: `github_create_issue`, `stripe_list_charges`
- Use verbs that match HTTP semantics: `get`, `list`, `create`, `update`, `delete`, `search`
- Be consistent across all tools in the same server
- Avoid abbreviations unless universally known

---

## Tool Descriptions

Keep descriptions concise (1–3 sentences). Include:
1. What the tool does
2. Key parameters
3. What it returns

Example:
```
Lists GitHub issues for a repository. Supports filtering by state, labels, and assignee.
Returns issue number, title, state, and URL.
```

---

## Input Schema Design

- Validate all inputs with Zod (TypeScript) or Pydantic (Python)
- Use `description` fields on every parameter
- Mark optional fields explicitly
- Provide sensible defaults for optional parameters
- Constrain strings with `minLength`/`maxLength` where appropriate
- Use enums for fixed option sets

---

## Response Format Guidelines

**Use JSON** for:
- Structured data that agents will process programmatically
- Lists of items
- Data with multiple fields

**Use Markdown** for:
- Human-readable summaries
- Reports and documentation
- When the client is likely to render markdown

**Best practice**: Return both when using modern SDKs via `structuredContent` + `content[text]`.

---

## Pagination

- Always support pagination for list endpoints
- Use `cursor`-based pagination (not offset) for large datasets
- Return `nextCursor` in responses when more results exist
- Default page size: 20–50 items
- Maximum page size: 100–200 items
- Include total count when cheap to compute

---

## Transport Selection

| Scenario | Transport |
|---|---|
| Remote server (cloud-hosted) | Streamable HTTP (stateless JSON) |
| Local tool (runs on user machine) | stdio |
| Real-time bidirectional streaming | WebSocket (advanced) |

**Prefer stateless HTTP** for remote servers — easier to scale, no session management.

---

## Error Handling

Return errors as MCP tool errors (not exceptions). Structure:
```json
{
  "isError": true,
  "content": [{ "type": "text", "text": "Error: <actionable message>" }]
}
```

Actionable error messages include:
- What went wrong
- Why it went wrong (if known)
- What the agent should do next

Example: `"Error: Rate limit exceeded. Retry after 60 seconds. Consider using pagination to fetch smaller batches."`

---

## Security

- Never log API keys or secrets
- Validate all inputs before passing to external APIs
- Use `readOnlyHint: true` for GET operations
- Use `destructiveHint: true` for DELETE/irreversible operations
- Sanitize user-controlled strings before using in queries

---

## Tool Annotations

Always set these on each tool:

```typescript
annotations: {
  readOnlyHint: true,       // Does NOT modify state
  destructiveHint: false,   // Does NOT delete/overwrite
  idempotentHint: true,     // Safe to call multiple times
  openWorldHint: false,     // Operates on known, bounded data
}
```

---

## Performance

- Use connection pooling for HTTP clients
- Cache authentication tokens (respect TTL)
- Implement retry with exponential backoff for transient failures
- Set reasonable timeouts (10–30s for most APIs)
