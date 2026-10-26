"""The agent loop: call the model, run any tools it asks for, repeat."""
from harness.llm import call_model
from harness.tools import SCHEMAS, run_tool

MAX_STEPS = 10  # a safety stop, so a confused model can't loop forever


def run_turn(messages, user_text):
    """Handle one user message. Mutates `messages` and returns the final text."""
    messages.append({"role": "user", "content": user_text})

    for _ in range(MAX_STEPS):
        reply = call_model(messages, SCHEMAS)
        messages.append(reply)  # the model's own reply becomes part of history

        tool_calls = reply.get("tool_calls")
        if not tool_calls:
            return reply.get("content") or ""  # plain text means the turn is done

        # The model may ask for several tools at once; run each one and
        # answer it with a "tool" message tied to the request by its id.
        for call in tool_calls:
            name = call["function"]["name"]
            args = call["function"]["arguments"]
            print(f"  [tool] {name}({args})")
            messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": run_tool(name, args),
            })
        # Loop back: the model now sees the tool results and continues.

    return f"(stopped after {MAX_STEPS} steps without a final answer)"
