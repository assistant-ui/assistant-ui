---
"@assistant-ui/react-langchain": patch
---

fix: do not default a tool message's `toolName` to an empty string

A tool message that arrives over the LangGraph v2 `messages` stream has no name -- the
protocol carries none, and the SDK rebuilds it as
`new ToolMessage({ id, content, tool_call_id })`. Defaulting that absence to `""` produced
a name that disagrees with every tool call, so `joinExternalMessages` threw
`Tool call name ... does not match existing tool call ...` during render, on every render
of a thread holding a completed tool call. `toolName` is optional on the converter's
`Message` type and the joiner skips its identity check when it is null, so the absence is
now left intact and the name is taken from the tool call. A result that does carry a
different name is still rejected.
