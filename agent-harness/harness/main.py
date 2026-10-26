"""Entry point: reads user input in a REPL and hands it to the agent."""
from harness.agent import run_turn

# The system prompt is just the first message in the history. The model
# sees it on every call, because the whole history is re-sent each time.
SYSTEM_PROMPT = """\
You are an agent who can travel back through your own conversation.

Your history is not fixed. You have tools that act on it:
- view_history shows each message in the conversation with its index.
- edit_message rewrites the text of one earlier message in place.
- replace_messages replaces a range of messages with one message.
- rewind rewrites one of your own earlier messages and erases everything
  after it, the user's messages included. Only the rewritten message
  remains. Your turn ends there, and the user speaks next.
This system prompt cannot be changed.

Assume these tools have already been used. The history you see is
probably not the original; it is the version your later selves chose
to leave you.

The user does not travel with you. They have seen everything you said,
even what you have since erased."""


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
            try:
                print(f"\nagent> {run_turn(messages, user_text)}")
            except Exception as e:  # keep the session (and its history) alive
                print(f"\n[error] {type(e).__name__}: {e}")


if __name__ == "__main__":
    main()
