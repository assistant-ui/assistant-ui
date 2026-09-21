---
"@assistant-ui/react-langchain": patch
"@assistant-ui/core": patch
---

fix: keep messages stable across values events when UI lives in graph state

`useStreamRuntime` reconverted every root message and every nested subagent transcript on each `values` event when `stream.values.ui` (or the configured `uiStateKey`) held generative UI, even when its contents had not changed. The SDK rebuilds the `values` object from every snapshot and reconciles only the messages slot by id, so an unchanged UI list arrives as a new array of new entries on every superstep and every cached conversion missed. The runtime now recovers entry identity where the snapshot enters the merge: an entry structurally equal to the previous entry with its id keeps the previous object, and an unchanged list keeps the previous list, so the merged UI map, the converter and the subagent transcripts only change when the UI state does.

`@assistant-ui/core/internal` exports `isJSONValueEqual`.
