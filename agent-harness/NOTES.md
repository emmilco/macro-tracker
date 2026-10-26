# Agent harness

Run from this directory:

    export DEEPSEEK_API_KEY=...
    python3 -m harness.main

Optional: `DEEPSEEK_MODEL` (default `deepseek-flash`).

## Step 3 candidates (modifications)

- ~~**Turn termination:** check `finish_reason` in `agent.py`.~~ Done: a
  final reply whose `finish_reason` isn't `"stop"` gets a warning appended.
  Still open: an explicit `finish` tool that ends the turn.
- **Thinking mode:** check whether `deepseek-flash` defaults to thinking
  mode, and whether `reasoning_content` must or must not be sent back
  during tool calls (unverified; the docs were unreachable from the sandbox).
- **Show interim text:** a reply can carry text alongside `tool_calls`;
  it's kept in history but never printed.
- Write/shell tools, plus a permission prompt before running them.
- Retries and error handling around the HTTP call in `llm.py`.
- Context growth: history is re-sent every call and only ever grows.

## History tools (`harness/history_tools.py`)

The agent can `view_history`, `edit_message` and `replace_messages` on its
own conversation. The system prompt and the in-flight tool call are
protected, and tool calls are never split from their results. After a
`replace_messages`, further history calls in the same reply are refused
(their indexes are stale). Untested against DeepSeek: a replacement is an
`assistant` message, which can put two assistant messages in a row.

`rewind(index, content)` rewrites one of the agent's own messages and erases
everything after it, user messages included (option C). The loop notices the
in-flight reply is gone, drops that reply's remaining calls, and calls the
model again from the rewound point. Rewinds count against `MAX_STEPS`.
Untested against DeepSeek: after a rewind the history ends on an assistant
message, which the API may reject or treat as a prefix to continue.
