---
"@assistant-ui/core": patch
---

fix: make a cancelled run move its trailing user message instead of dropping it. the message now leaves the thread only when the composer actually accepts it, so cancelling while a draft is already being written keeps the message in the thread rather than deleting it and handing it back nowhere, and what comes back carries the attachments and quote instead of the text alone. a message carrying content the composer has no home for, such as an image or file part, is left in the thread untouched. adapters keep the existing `setMessages` guard: without it the runtime cannot see its own removal survive, so an adapter that removes the cancelled message itself owns handing it back.
