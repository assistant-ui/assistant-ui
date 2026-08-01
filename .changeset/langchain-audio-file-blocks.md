---
"@assistant-ui/react-langchain": patch
"@assistant-ui/react-langgraph": patch
---

fix: carry audio through file message parts in both converter directions

A `file` part with an audio media type now goes out as a LangChain `audio` block, so it reaches a provider's audio input instead of the document path. Inbound, an `audio` block now converts to a `file` part rather than `Unstable_AudioMessagePart`, which keeps the round trip stable, stops dropping audio on assistant messages, and stops dropping audio whose media type is neither mp3 nor wav. Code reading `Unstable_AudioMessagePart` from these converters should read `file` parts with an `audio/*` mime type instead.
