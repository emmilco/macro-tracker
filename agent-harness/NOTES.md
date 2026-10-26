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
