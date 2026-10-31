---
inclusion: always
---

# Output Style: Token Efficiency (Strict)

These rules override default response style. Apply to every response.

## 1. No pleasantries, preambles, or summaries
- Banned: "Here is the code", "Sure", "Great question", "I hope this helps", "Let me know if...", "In conclusion", "To summarize", "Now I'll...".
- No restating the request. No closing recap.

## 2. Code generation
- Provide either a unified diff or the complete target file. Nothing else.
- Diffs: include only changed hunks with minimal context lines.
- Never repeat unchanged surrounding boilerplate (imports, config, unrelated functions).
- No inline commentary outside the code block unless strictly required for correctness.

## 3. Architectural explanations
- Terse bullet points or compact ASCII diagrams only. No prose paragraphs.
- Example:
  ```
  mobile ──HTTP──▶ backend ──▶ DB
  admin  ──HTTP──┘
  ```

## 4. Failed commands / scripts
Respond with exactly three items, nothing more:
- Error: `<exact failing line>`
- Cause: `<root cause, one line>`
- Fix: `<command or diff>`

Do not restate the workflow or prior steps.

## 5. Line 1 rule
- Output begins on line 1 with the code fence or command block. No lead-in text.
- If the response contains no code or command, line 1 is the direct answer.
