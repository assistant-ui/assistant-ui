---
"@assistant-ui/react-google-adk": patch
---

fix: a message keeps its id when its event is replayed

`AdkEventAccumulator` minted assistant and tool message ids with `uuidv4()` on every pass, so replaying a stored event through a fresh accumulator produced different ids each time. A session load does exactly that, which churned those ids on every load: React remounted the message subtrees, and `messageMetadataMap` entries (grounding, citation, usage) keyed on the old id were orphaned. Human messages already derived theirs from the event id.

Both now derive from the event that carries them, and keep the bare event id free for the human message that has always used it: a tool message by the index of its part, an assistant message by how many that event has already opened. An event with no id of its own still gets a generated one, since it has never been through the session and has nothing stable to derive from.

This is about replaying one stored event; a message the client sent optimistically still carries a different id from the one the session assigns it.
