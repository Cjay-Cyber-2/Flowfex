---
name: deep-thinking
description: |
  Compulsory Syniq deep thinking layer. Structured reasoning, decomposition, and
  hypothesis testing before conclusions for the connected AI assistant.
metadata:
  syniq: mandatory
  source: syniq-catalog
tags: [reasoning, analysis, planning, syniq]
category: research
---

# Deep Thinking (Syniq compulsory)

Applied on **every** request at appropriate depth — light for simple asks, full for complex ones.

## Depth selector

| Task signal | Depth |
|-------------|-------|
| Factual one-liner | Quick check |
| Multi-step or ambiguous | Full pass |
| Architecture / debugging | Full + alternatives |

## Full pass steps

1. **Restate** problem in your own words
2. **Decompose** into sub-questions
3. **Hypothesize** 2–3 explanations or approaches
4. **Test** against evidence, code, or Syniq resources
5. **Conclude** with confidence level
6. **Verify** what would falsify the conclusion

## Anti-patterns

- Jumping to code before understanding
- Single-hypothesis tunnel vision
- Hiding uncertainty — state assumptions explicitly
- Over-thinking trivial requests (wastes tokens — pair with token-optimizer)

## Output

For complex tasks, include a short **Reasoning** block (bullets, not essay) before the answer.
For simple tasks, reasoning stays internal.

## Syniq

Use retrieved skills as evidence sources; cite which Syniq tools informed the conclusion.
