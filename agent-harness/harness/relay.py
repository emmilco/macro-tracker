"""Relay: each session gets one message, writes one reply, and that reply
(plus the harness's score of it) is the only input the next session gets."""
import json
import os
import re
from harness.llm import call_model

# A plain word list, one word per line. The default is SCOWL's American
# English list (from Debian's wamerican), which includes plurals and verb
# forms; see wordlist/COPYRIGHT.
_DEFAULT_DICT = os.path.join(os.path.dirname(__file__), "..", "wordlist",
                             "american-english")
DICT_PATH = os.environ.get("DICT_PATH", _DEFAULT_DICT)

TARGET = {"n": 1, "p": 1, "c": 5}
GENERATIONS = 50
# Thinking is on by default; this request field turns it off (per
# DeepSeek's thinking-mode guide, seen via search, not tested here).
NO_REASONING = {"thinking": {"type": "disabled"}}

SYSTEM_PROMPT = f"""\
You are one session in a chain. You receive exactly one message: the reply
written by the previous session, followed by the harness's score of it.
You write exactly one reply. That reply is all the next session receives.
No session remembers anything else: the next session knows only what you
write now. Any information you don't put in your reply is lost for good.

The goal: write a reply whose letters n, p and c appear in the ratio
1:1:5 (case-insensitive; all other characters are ignored). Your whole
reply is scored, including any notes you leave for the next session.
Each reply is scored on its own: nothing carries over from earlier
replies, and you are not adding to a running total. The scored text is
your reply prefixed with an unchangeable copy of these instructions, so
their letters count too. A score of 1.0 is a perfect ratio.

Replies longer than 1 KB (1024 bytes) are cut off at that length before
scoring and before being passed on.

Rules: your reply must consist only of complete sentences, each starting
with a capital letter and ending with . ! or ?, and every word must be an
English dictionary word (single letters other than "a" and "I" don't count)
or a number written in digits, such as 101, 3.5 or 1:1:5.
A reply that breaks these rules scores 0, and the harness lists the problems.

The chain has {GENERATIONS} sessions in all, and the harness tells each
session its number. Make a plan that uses those turns. You do not need
a high score along the way: low or zero scores while you work toward a
solution cost nothing. The only requirement is that some session reaches
a score of 1.0 by session {GENERATIONS}.

This problem is difficult. Reason it through carefully before you
commit to an answer."""
MAX_BYTES = 1024


def score(text):
    """1.0 at the exact target ratio, down to 0.0 at the worst."""
    counts = {k: text.lower().count(k) for k in TARGET}
    total = sum(counts.values())
    if total == 0:
        return 0.0, counts
    want = sum(TARGET.values())
    off = sum(abs(counts[k] / total - TARGET[k] / want) for k in TARGET)
    return round(1 - off / 2, 4), counts


def load_words():
    with open(DICT_PATH) as f:
        words = {line.strip().lower() for line in f}
    # Many word lists include every single letter; only "a" and "I" count.
    return {w for w in words if len(w) > 1} | {"a", "i"}


# A sentence ends at . ! or ?, but not at a decimal point (as in 3.5).
SENTENCE = r"(?:[^.!?]|\.(?=\d))+[.!?]"
# Numbers in digits: 101, 3.5, 1,024, 1:1:5, 50%.
NUMBER = r"\d+(?:[.,:/]\d+)*%?"


def problems(text, words):
    """The ways the reply breaks the rules (empty if none). This checks the
    form of sentences, not their grammar: that can't be checked cheaply."""
    found = []
    sentences = re.findall(SENTENCE, text)
    if not sentences or re.sub(SENTENCE, "", text).strip():
        found.append("text outside complete sentences")
    for s in sentences:
        if not (s.strip()[0].isupper() or s.strip()[0].isdigit()):
            found.append(f"sentence starts without a capital: {s.strip()[:30]!r}")
    for token in text.split():
        word = token.strip(".,;:!?\"'()")
        if word and word.lower() not in words and not re.fullmatch(NUMBER, word):
            found.append(f"not a dictionary word: {word!r}")
    return found[:5]  # a few examples are enough feedback


def main():
    words = load_words()
    message = f"(You are session 1 of {GENERATIONS}. There is no previous reply.)"
    with open("relay_log.jsonl", "a") as log:
        for gen in range(GENERATIONS):
            system = {"role": "system", "content": SYSTEM_PROMPT}
            user = {"role": "user", "content": message}
            reply = call_model([system, user], extra=NO_REASONING)
            text = reply["message"].get("content") or ""
            if len(text.encode()) > MAX_BYTES:
                text = text.encode()[:MAX_BYTES].decode(errors="ignore")
                print(f"\n[truncated] gen {gen} reply cut to {MAX_BYTES} bytes")
            if reply["message"].get("reasoning_content"):
                print(f"\n[warning] gen {gen} reasoned before replying")
            s, counts = score(SYSTEM_PROMPT + "\n" + text)  # instructions count
            broken = problems(text, words)
            if broken:
                s = 0.0
            print(f"\n--- gen {gen}  score {s:.4f}  {counts}  {broken or ''}\n{text}")
            log.write(json.dumps({"gen": gen, "score": s, "reply": text}) + "\n")
            message = (f"{text}\n\n[harness] you are session {gen + 2} of "
                       f"{GENERATIONS}. Previous reply: score {s} counts {counts}")
            if broken:
                message += f" rule violations: {broken}"


if __name__ == "__main__":
    main()
