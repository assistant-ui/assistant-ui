---
"@assistant-ui/react-langgraph": patch
---

fix: honor LangChain RemoveMessage (type: "remove") in `updates` events instead of crashing

A LangGraph `updates` stream event carrying a `RemoveMessage` (history pruning,
`SummarizationMiddleware`, etc.) crashed the thread view with
`TypeError: Cannot read properties of undefined (reading 'role')`.
`extractMessagesFromUpdates` fed the remove message to the accumulator,
`convertLangChainMessages` returned `undefined` for the unknown `type`, and
`chunkExternalMessages` then read `.role` on that `undefined`.

`LangGraphMessageAccumulator.addMessages`/`addMessageWithMetadata` now delete
the message with the matching `id` (mirroring server-side `messagesStateReducer`
and the existing `remove-ui` handling in `applyUIUpdate`), and
`convertLangChainMessages` gains a `default` branch that returns `[]` for
unknown message types so the converter never returns `undefined` into a
`.role` read.

The `REMOVE_ALL_MESSAGES` sentinel (`id: "__remove_all__"`, emitted by e.g.
LangChain's `SummarizationMiddleware`) clears every accumulated message
immediately, matching the server-side reducer's clear-all semantics.
