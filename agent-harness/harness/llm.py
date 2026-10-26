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
