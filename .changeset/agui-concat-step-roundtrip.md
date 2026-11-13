---
"@assistant-ui/react-ag-ui": patch
---

Send a message that joins several steps back as one step at a time: each step's reasoning, then its assistant record, then its tool results. Signed reasoning with empty text is kept, and redacted blocks go back to the step they arrived in. Backends that rebuild history from the request, like pydantic-ai on Claude with extended thinking, no longer reject follow-ups and tool continuations after `joinStrategy: "concat-content"`.
