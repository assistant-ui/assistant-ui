---
"@assistant-ui/react-google-adk": patch
---

fix: a tool message keeps its id when its event is replayed

`AdkEventAccumulator` minted a tool message's id with `uuidv4()` on every pass, so replaying a stored event through a fresh accumulator produced a different id each time. A session load does exactly that, which churned the id of every tool message on every load: React remounted those message subtrees and any per-message metadata keyed on the old id was orphaned. Assistant and human messages were already derived from the event id and unaffected.

The id now derives from the event that carries the response, disambiguated by the response id and falling back to the part index when the payload omits it. An event with no id of its own still gets a generated one, since it has never been through the session and has nothing stable to derive from.

This is about replaying one stored event; a message the client sent optimistically still carries a different id from the one the session assigns it, for tool messages as for every other type.
