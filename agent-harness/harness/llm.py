"""Model client: sends the conversation to the DeepSeek API, returns its reply."""
import json
import os
import urllib.request

# DeepSeek speaks the OpenAI "chat completions" format.
URL = "https://api.deepseek.com/chat/completions"
MODEL = os.environ.get("DEEPSEEK_MODEL", "deepseek-flash")


def call_model(messages, tools):
    """Send the whole conversation plus tool schemas; return the reply message.

    The API is stateless: it remembers nothing between calls, so the
    caller must send the full history every time.
    """
    body = {"model": MODEL, "messages": messages, "tools": tools}
    request = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={
            "Content-Type": "application/json",
            "Authorization": f"Bearer {os.environ['DEEPSEEK_API_KEY']}",
        },
    )
    with urllib.request.urlopen(request, timeout=120) as response:
        data = json.load(response)
    # We return the whole "choice", which looks like:
    #   {"message": {"role": "assistant", "content": "...", "tool_calls": [...]},
    #    "finish_reason": "stop" | "tool_calls" | "length" | ...}
    # tool_calls is present only if the model wants tools; finish_reason
    # says why the model stopped writing.
    return data["choices"][0]
