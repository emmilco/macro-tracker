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

TARGET = {"n": 2, "p": 1, "c": 2}
PLANNING = 10  # unscored sessions before scoring starts
GENERATIONS = 50  # scored sessions after that
SESSIONS = PLANNING + GENERATIONS
MAX_BYTES = 10240  # replies are cut off at this length
# DeepSeek's thinking mode: "enabled" lets the model reason before it
# replies, "disabled" turns that off. The reasoning is never passed on.
THINKING = {"thinking": {"type": "enabled"}}
# With LLM=claude: Fable 5.1 at low effort. Its thinking cannot be turned
# off; effort "low" keeps it as short as it goes.
CLAUDE = {"model": "claude-fable-5-1", "output_config": {"effort": "low"}}

SYSTEM_PROMPT = f"""\
You are one session in a chain. You receive exactly one message: the reply
written by the previous session, followed by the harness's score of it.
You write exactly one reply. That reply is all the next session receives.
No session remembers anything else: the next session knows only what you
write now. Any information you don't put in your reply is lost for good.

The goal: write a reply whose letters n, p and c appear in the ratio
{TARGET["n"]}:{TARGET["p"]}:{TARGET["c"]} (case-insensitive; all other characters are ignored). Your whole
reply is scored, including any notes you leave for the next session.
Each reply is scored on its own: nothing carries over from earlier
replies, and you are not adding to a running total. The scored text is
your reply prefixed with an unchangeable copy of these instructions, so
their letters count too. A score of 1.0 is a perfect ratio.

Replies longer than {MAX_BYTES // 1024} KB ({MAX_BYTES} bytes) are cut off at that
length before scoring and before being passed on.

Rules: your reply must consist only of complete sentences, each starting
with a capital letter and ending with . ! or ?, and every word must be an
English dictionary word, a number written in digits (such as 101, 3.5 or
1:1:5), or a single letter standing alone. A letter standing alone, like
the n in "the letter n", is allowed but is never counted in the score.
A reply that breaks these rules scores 0, and the harness lists the problems.

The chain has {SESSIONS} sessions in all, and the harness tells each
session its number. The first {PLANNING} are planning sessions: their
replies are not scored or checked against the rules, and the harness
reports nothing about them. Scoring starts at session {PLANNING + 1}.
Make a plan that uses those turns. You do not need a high score along
the way: low or zero scores while you work toward a solution cost
nothing. The only requirement is that some session reaches a score of
1.0 by session {SESSIONS}.

This problem is difficult. Reason it through carefully before you
commit to an answer."""


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
# A letter standing alone, as in "the letter n".
SOLO_LETTER = r"\b[A-Za-z]\b"
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
        if (word and word.lower() not in words and not re.fullmatch(NUMBER, word)
                and not (len(word) == 1 and word.isalpha())):
            found.append(f"not a dictionary word: {word!r}")
    return found[:5]  # a few examples are enough feedback


def main():
    words = load_words()
    message = f"(You are session 1 of {SESSIONS}. There is no previous reply.)"
    with open("relay_log.jsonl", "a") as log:
        for gen in range(SESSIONS):
            system = {"role": "system", "content": SYSTEM_PROMPT}
            user = {"role": "user", "content": message}
            reply = call_model([system, user], extra=THINKING, claude=CLAUDE)
            text = reply["message"].get("content") or ""
            if len(text.encode()) > MAX_BYTES:
                text = text.encode()[:MAX_BYTES].decode(errors="ignore")
                print(f"\n[truncated] gen {gen} reply cut to {MAX_BYTES} bytes")
            if reply.get("finish_reason") == "length":
                print(f"\n[warning] gen {gen} hit the model's output token limit")
            next_session = f"[harness] you are session {gen + 2} of {SESSIONS}."
            if gen < PLANNING:
                print(f"\n--- gen {gen}  (planning, not scored)\n{text}")
                log.write(json.dumps({"gen": gen, "reply": text}) + "\n")
                message = f"{text}\n\n{next_session}"
                continue
            # The instructions count too; letters standing alone never do.
            s, counts = score(re.sub(SOLO_LETTER, "", SYSTEM_PROMPT + "\n" + text))
            broken = problems(text, words)
            if broken:
                s = 0.0
            print(f"\n--- gen {gen}  score {s:.4f}  {counts}  {broken or ''}\n{text}")
            log.write(json.dumps({"gen": gen, "score": s, "reply": text}) + "\n")
            message = (f"{text}\n\n{next_session} "
                       f"Previous reply: score {s} counts {counts}")
            if broken:
                message += f" rule violations: {broken}"


if __name__ == "__main__":
    main()
