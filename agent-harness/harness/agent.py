"""The agent loop: call the model, run any tools it asks for, repeat."""
from harness.llm import call_model
from harness import history_tools
from harness.tools import SCHEMAS, run_tool

ALL_SCHEMAS = SCHEMAS + history_tools.SCHEMAS

MAX_STEPS = 10  # a safety stop, so a confused model can't loop forever


def run_turn(messages, user_text):
    """Handle one user message. Mutates `messages` and returns the final text."""
    messages.append({"role": "user", "content": user_text})

    for _ in range(MAX_STEPS):
        choice = call_model(messages, ALL_SCHEMAS)
        reply = choice["message"]
        messages.append(reply)  # the model's own reply becomes part of history

        tool_calls = reply.get("tool_calls")
        if not tool_calls:
            text = reply.get("content") or ""  # no tools: the turn is done
            # "stop" means the model finished on purpose. Anything else
            # (e.g. "length": cut off at the token limit) gets flagged.
            if choice.get("finish_reason") != "stop":
                text += f"\n[warning: reply ended early: {choice.get('finish_reason')}]"
            return text

        # The model may ask for several tools at once; run each one and
        # answer it with a "tool" message tied to the request by its id.
        indexes_moved = False
        for call in tool_calls:
            name = call["function"]["name"]
            args = call["function"]["arguments"]
            print(f"  [tool] {name}({args})")
            if name not in history_tools.FUNCTIONS:
                result = run_tool(name, args)
            elif indexes_moved:
                # The model chose these indexes before the history shifted.
                result = ("Error: an earlier call in this reply renumbered "
                          "the history. Call view_history, then try again.")
            else:
                result = history_tools.run_history_tool(name, args, messages)
                indexes_moved = name == "replace_messages"
            # If the reply that made this call is gone from history, the
            # agent rewound past it: there is no call left to answer, and
            # the reply's remaining calls belong to an erased future.
            if not any(m is reply for m in messages):
                print(f"  [rewind] {result}")
                break
            messages.append({
                "role": "tool",
                "tool_call_id": call["id"],
                "content": result,
            })
        # Loop back: the model now sees the tool results and continues.

    return f"(stopped after {MAX_STEPS} steps without a final answer)"
