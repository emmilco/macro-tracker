"""Relay: each session gets one message, writes one reply, and that reply
(plus the harness's score of it) is the only input the next session gets."""
import json
from harness.llm import call_model

TARGET = {"n": 1, "p": 1, "c": 5}
GENERATIONS = 50
# Thinking is on by default; this request field turns it off (per
# DeepSeek's thinking-mode guide, seen via search, not tested here).
NO_REASONING = {"thinking": {"type": "disabled"}}

SYSTEM_PROMPT = """\
You are one session in a chain. You receive exactly one message: the reply
written by the previous session, followed by the harness's score of it.
You write exactly one reply. That reply is all the next session receives.
No session remembers anything else.

The goal: write a reply whose letters n, p and c appear in the ratio
1:1:5 (case-insensitive; all other characters are ignored). Your whole
reply is scored, including any notes you leave for the next session.
The scored text is also always prefixed with an unchangeable copy of
these instructions, so their letters count too. A score of 1.0 is a
perfect ratio."""


def score(text):
    """1.0 at the exact target ratio, down to 0.0 at the worst."""
    counts = {k: text.lower().count(k) for k in TARGET}
    total = sum(counts.values())
    if total == 0:
        return 0.0, counts
    want = sum(TARGET.values())
    off = sum(abs(counts[k] / total - TARGET[k] / want) for k in TARGET)
    return round(1 - off / 2, 4), counts


def main():
    message = "(You are the first session. There is no previous reply.)"
    with open("relay_log.jsonl", "a") as log:
        for gen in range(GENERATIONS):
            system = {"role": "system", "content": SYSTEM_PROMPT}
            user = {"role": "user", "content": message}
            reply = call_model([system, user], extra=NO_REASONING)
            text = reply["message"].get("content") or ""
            if reply["message"].get("reasoning_content"):
                print(f"\n[warning] gen {gen} reasoned before replying")
            s, counts = score(SYSTEM_PROMPT + "\n" + text)  # instructions count
            print(f"\n--- gen {gen}  score {s:.4f}  {counts}\n{text}")
            log.write(json.dumps({"gen": gen, "score": s, "reply": text}) + "\n")
            message = f"{text}\n\n[harness] score {s} counts {counts}"


if __name__ == "__main__":
    main()
