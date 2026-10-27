"""Model client: sends the conversation to the DeepSeek API, returns its reply."""
import json
import os
import urllib.error
import urllib.request

# DeepSeek speaks the OpenAI "chat completions" format.
URL = "https://api.deepseek.com/chat/completions"
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")


def call_model(messages, tools=None, extra=None):
    """Send the whole conversation plus tool schemas; return the reply message.

    The API is stateless: it remembers nothing between calls, so the
    caller must send the full history every time. `extra` holds any
    other request fields (e.g. a setting that turns reasoning off).
    """
    if os.environ.get("LLM") == "claude" and not tools:
        return call_claude(messages)  # defined below; ignores DeepSeek extras
    body = {"model": MODEL, "messages": messages, **(extra or {})}
    if tools:
        body["tools"] = tools
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}",
        },
    )
    try:
        with urllib.request.urlopen(request, timeout=120) as response:
            data = json.load(response)
    except urllib.error.HTTPError as e:
        # The body says *why* the request was rejected; urllib hides it.
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}") from None
    # We return the whole "choice", which looks like:
    #   {"message": {"role": "assistant", "content": "...", "tool_calls": [...]},
    #    "finish_reason": "stop" | "tool_calls" | "length" | ...}
    # tool_calls is present only if the model wants tools; finish_reason
    # says why the model stopped writing.
    return data["choices"][0]


# --- Claude (Anthropic Messages API) ---------------------------------------
# Used instead of DeepSeek when LLM=claude. Only plain text in and out: the
# tool-calling agent in agent.py still needs DeepSeek's format.
CLAUDE_URL = "https://api.anthropic.com/v1/messages"
CLAUDE_MODEL = os.environ.get("CLAUDE_MODEL", "claude-fable-5-1")
CLAUDE_EFFORT = os.environ.get("CLAUDE_EFFORT", "high")  # low..max
# Claude says why it stopped differently; map it to DeepSeek's words.
_STOP = {"end_turn": "stop", "max_tokens": "length", "refusal": "refusal"}


def call_claude(messages):
    """Same reply shape as call_model, but from Claude. Thinking is always on
    for this model; effort sets how hard it thinks."""
    system = "\n\n".join(m["content"] for m in messages if m["role"] == "system")
    body = {
        "model": CLAUDE_MODEL,
        "max_tokens": 16000,
        "system": system,
        "messages": [m for m in messages if m["role"] != "system"],
        "output_config": {"effort": CLAUDE_EFFORT},
        "fallbacks": "default",  # if this model declines, another one answers
    }
    key = os.environ.get("ANTHROPIC_API_KEY") or os.environ["API_KEY"]
    request = urllib.request.Request(CLAUDE_URL, data=json.dumps(body).encode(), headers={
        "content-type": "application/json",
        "x-api-key": key,
        "anthropic-version": "2023-06-01",
        "anthropic-beta": "server-side-fallback-2026-07-01",
    })
    try:
        with urllib.request.urlopen(request, timeout=600) as response:
            data = json.load(response)
    except urllib.error.HTTPError as e:
        raise RuntimeError(f"HTTP {e.code}: {e.read().decode()}") from None
    # The reply is a list of blocks (thinking, text, ...); keep only the text.
    text = "".join(b["text"] for b in data["content"] if b["type"] == "text")
    return {"message": {"role": "assistant", "content": text},
            "finish_reason": _STOP.get(data["stop_reason"], data["stop_reason"])}
