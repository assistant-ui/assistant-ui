---
"@assistant-ui/react-ag-ui": patch
---

fix: order tool-call parts by parentMessageId

The run aggregator appended tool-call parts in wire-arrival order. Because the messages and tool-call channels are not ordered relative to each other on the wire, a tool whose `TOOL_CALL_START` arrived after a later message's text was rendered below that text instead of under the message that spawned it. Tool-call parts are now placed adjacent to their `parentMessageId` text part (falling back to append when the parent is unknown), matching the message association the canonical `@ag-ui/client` already performs.
