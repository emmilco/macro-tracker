"""Entry point: reads user input in a REPL and hands it to the agent."""
from harness.agent import run_turn

# The system prompt is just the first message in the history. The model
# sees it on every call, because the whole history is re-sent each time.
SYSTEM_PROMPT = (
    "You are a helpful assistant with tools for reading files. "
    "Use them when you need to look at the filesystem."
)


def main():
    messages = [{"role": "system", "content": SYSTEM_PROMPT}]
    print("Agent ready. Type a message, or Ctrl-D to quit.")
    while True:
        try:
            user_text = input("\nyou> ").strip()
        except (EOFError, KeyboardInterrupt):
            print()
            return
        if user_text:
            # `messages` persists across turns, so the agent remembers them.
            print(f"\nagent> {run_turn(messages, user_text)}")


if __name__ == "__main__":
    main()
