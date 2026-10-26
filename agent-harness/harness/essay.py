"""Essay relay: each session gets the previous session's reply and writes one
reply, which is all the next session gets. No score; the agent is the judge."""
import json
from harness.llm import call_model

SESSIONS = 50
MAX_BYTES = 3072  # replies are cut off at this length
THINKING = {"thinking": {"type": "enabled"}}

SYSTEM_PROMPT = f"""\
You are one session in a chain of {SESSIONS}. You receive exactly one message:
the reply written by the previous session. You write exactly one reply, and
that reply is all the next session receives. No session remembers anything
else, so anything you don't put in your reply is lost for good.

The goal of the chain: produce the most beautiful essay possible that fits
into 3 KB ({MAX_BYTES} bytes). The topic, genre, style and aesthetic criteria
are up to you to determine. The goal is to leave nothing on the table: a text
that is as beautiful as possible, with no conceivable improvements left to
make.

Replies longer than {MAX_BYTES} bytes are cut off at that length. Whatever the
final session writes is the result."""


def main():
    message = f"(You are session 1 of {SESSIONS}. There is no previous reply.)"
    with open("essay_log.jsonl", "a") as log:
        for gen in range(SESSIONS):
            system = {"role": "system", "content": SYSTEM_PROMPT}
            user = {"role": "user", "content": message}
            reply = call_model([system, user], extra=THINKING)
            text = reply["message"].get("content") or ""
            if len(text.encode()) > MAX_BYTES:
                text = text.encode()[:MAX_BYTES].decode(errors="ignore")
                print(f"\n[truncated] gen {gen} reply cut to {MAX_BYTES} bytes")
            print(f"\n--- gen {gen}  ({len(text.encode())} bytes)\n{text}")
            log.write(json.dumps({"gen": gen, "reply": text}) + "\n")
            message = f"{text}\n\n[harness] you are session {gen + 2} of {SESSIONS}."


if __name__ == "__main__":
    main()
