# MCP Server Evaluation Guide

Complete guide for creating evaluations that test whether LLMs can effectively use your MCP server.

---

## Purpose

Evaluations verify that your MCP server enables LLMs to answer realistic, complex questions by combining multiple tool calls. They catch:
- Tools with unclear descriptions that agents can't discover
- Missing functionality for common use cases
- Error responses that don't guide agents toward solutions
- Performance issues in multi-step workflows

---

## Process

### Step 1: Tool Inspection

List all available tools and understand what each returns:
```
service_list_items     → items[], nextCursor
service_get_item       → item{id, name, status, tags, createdAt}
service_create_item    → item{id, ...}
service_search_items   → items[], totalCount
```

### Step 2: Content Exploration (Read-Only)

Use your tools to explore available data. Call `list` and `search` tools to understand what data exists. Identify:
- What entities exist
- What relationships between entities are queryable
- What aggregations or filters are possible

### Step 3: Question Generation

Create 10 questions following these rules:

| Rule | Description |
|---|---|
| Independent | Each question solvable without other answers |
| Read-only | Never requires creating/deleting data |
| Complex | Requires ≥2 tool calls to answer |
| Realistic | Something a real user would actually want to know |
| Verifiable | Single, unambiguous answer |
| Stable | Answer won't change as data changes |

### Step 4: Answer Verification

Solve each question yourself using your MCP tools. Document the exact tool call sequence that produces the answer. If you can't find a definitive answer, revise the question.

---

## Question Complexity Levels

**Level 1 (Simple):** Single tool call
- "How many items are in active status?" ❌ Too simple

**Level 2 (Medium):** 2–3 tool calls, some filtering
- "What is the name of the most recently created item tagged with 'production'?" ✅ Good

**Level 3 (Complex):** 3+ tool calls, aggregation, cross-referencing
- "Which tag appears most frequently across all items created in the last 30 days that have 'active' status?" ✅ Excellent

Target mix: 20% Level 2, 80% Level 3.

---

## Output Format

```xml
<evaluation>
  <qa_pair>
    <question>What is the total number of items with 'active' status that were created before 2024-01-01 and have at least one tag starting with 'prod-'?</question>
    <answer>42</answer>
  </qa_pair>
  <qa_pair>
    <question>Among all items tagged 'critical', which one has the longest description? Return its id.</question>
    <answer>item_a7f3k2</answer>
  </qa_pair>
  <!-- 8 more qa_pairs -->
</evaluation>
```

Save to: `evaluations/eval-{server-name}.xml`

---

## Anti-Patterns to Avoid

**Time-sensitive answers:**
- ❌ "How many items were created today?"
- ✅ "How many items were created in January 2024?"

**Ambiguous answers:**
- ❌ "What is the most popular tag?" (ties possible)
- ✅ "What is the alphabetically first tag that appears on more than 5 items?"

**Destructive operations:**
- ❌ "Create an item named 'test' and return its id"
- ✅ Always read-only

**Trivially answered:**
- ❌ "What fields does an item have?"
- ✅ Require real data exploration

---

## Running Evaluations

After creating your evaluation file, test it by asking an LLM agent:

1. Connect the LLM to your MCP server
2. For each `<qa_pair>`, ask the `<question>` and compare the answer to `<answer>`
3. Score: correct answers / total questions

Target: **≥8/10** correct answers before considering the MCP server production-ready.

If the agent consistently fails certain questions, that signals:
- Missing tools (add them)
- Unclear tool descriptions (improve them)
- Pagination not working (fix it)
- Error messages not actionable (improve them)
