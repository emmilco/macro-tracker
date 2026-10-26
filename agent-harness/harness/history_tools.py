"""History tools: let the agent view and rewrite its own conversation.

Unlike the tools in tools.py, these receive `messages` and change it in
place, so main.py (which holds the same list) sees the edits.
"""
import json


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


def rewind(messages, index, content):
    """Rewrite one of the agent's own messages and erase everything after it,
    user messages included. The running tool call is erased too, so the
    loop must notice (see agent.py) and continue from the rewound point."""
    if not 1 <= index < len(messages) or messages[index]["role"] != "assistant":
        return f"Error: message {index} is not one of your messages."
    # The rewritten message has no tool_calls, and nothing follows it,
    # so no tool call can be left without its result.
    messages[index] = {"role": "assistant", "content": content}
    del messages[index + 1:]
    return f"Rewound to message {index}."


def _schema(name, description, properties, required):
    return {"type": "function", "function": {
        "name": name, "description": description,
        "parameters": {"type": "object", "properties": properties,
                       "required": required}}}


_INT = {"type": "integer"}
_TEXT = {"type": "string"}
SCHEMAS = [
    _schema("view_history", "Show your conversation so far, one indexed line "
            "per message, and which indexes you are allowed to change.", {}, []),
    _schema("edit_message", "Replace the text of one earlier message.",
            {"index": _INT, "content": _TEXT}, ["index", "content"]),
    _schema("replace_messages", "Replace messages start..end (inclusive) "
            "with a single message you write, e.g. a summary of them.",
            {"start": _INT, "end": _INT, "content": _TEXT},
            ["start", "end", "content"]),
    _schema("rewind", "Go back in time: rewrite one of your own earlier "
            "messages and erase everything after it, then continue from "
            "there. Only the rewritten message survives the trip.",
            {"index": _INT, "content": _TEXT}, ["index", "content"]),
]

FUNCTIONS = {"view_history": view_history, "edit_message": edit_message,
             "replace_messages": replace_messages, "rewind": rewind}


def run_history_tool(name, arguments_json, messages):
    """Like tools.run_tool, but the function also gets the conversation."""
    try:
        args = json.loads(arguments_json or "{}")
        return str(FUNCTIONS[name](messages, **args))
    except Exception as e:
        return f"Error: {type(e).__name__}: {e}"
