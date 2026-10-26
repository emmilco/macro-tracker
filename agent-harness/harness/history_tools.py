"""History tools: let the agent view and rewrite its own conversation.

Unlike the tools in tools.py, these receive `messages` and change it in
place, so main.py (which holds the same list) sees the edits.
"""


def _editable(messages):
    """Indexes the agent may change: after the system prompt (index 0), and
    before the assistant message whose tool call is running right now."""
    last = max(i for i, m in enumerate(messages) if m["role"] == "assistant")
    return range(1, last)


def view_history(messages):
    lines = []
    for i, m in enumerate(messages):
        text = (m.get("content") or "").replace("\n", " ")
        calls = [c["function"]["name"] for c in m.get("tool_calls") or []]
        extra = f" calls={calls}" if calls else ""
        lines.append(f"[{i}] {m['role']}{extra}: {text[:80]}")
    ok = _editable(messages)
    lines.append(f"(editable: {ok.start}-{ok.stop - 1})")
    return "\n".join(lines)


def edit_message(messages, index, content):
    if index not in _editable(messages):
        return f"Error: message {index} is protected or out of range."
    messages[index]["content"] = content
    return f"Message {index} updated."


def replace_messages(messages, start, end, content):
    """Replace messages start..end (inclusive) with one assistant message."""
    ok = _editable(messages)
    if start not in ok or end not in ok or start > end:
        return f"Error: range {start}-{end} is protected or invalid."
    # A tool result must directly follow the call that asked for it, or the
    # API rejects the conversation. So the range may not start on a tool
    # result (its call would be outside) or stop just before one (its call
    # would be inside, deleted).
    if messages[start]["role"] == "tool" or messages[end + 1]["role"] == "tool":
        return "Error: range would split a tool call from its result."
    messages[start:end + 1] = [{"role": "assistant", "content": content}]
    return f"Replaced messages {start}-{end} with one message."
