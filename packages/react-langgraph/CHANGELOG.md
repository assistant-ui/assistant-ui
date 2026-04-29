# @assistant-ui/react-langgraph

## 0.13.12

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/store@0.2.9

## 0.13.11

### Patch Changes

- [#3572](https://github.com/assistant-ui/assistant-ui/pull/3572) [`0ba98dc`](https://github.com/assistant-ui/assistant-ui/commit/0ba98dc070f913c1492b2cf7bbe4e1bb82fe33c6) - fix: set thread.isLoading during load handler in useLangGraphRuntime ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3796](https://github.com/assistant-ui/assistant-ui/pull/3796) [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836) - feat(react-langgraph): add uiComponents option for static and dynamic data renderers ([@ShobhitPatra](https://github.com/ShobhitPatra))

  Add `uiComponents` option to `useLangGraphRuntime` for registering static data renderers by name and a `fallback` renderer for dynamic loading (e.g. LangSmith's `LoadExternalComponent`), directly from the runtime hook.

  Core `DataRenderers` scope also gains a `fallbacks` stack (plus `setFallbackDataUI` method) that the adapter registers into; resolution is `renderers[name][0]` → `fallbacks[0]` → inline `Fallback`.

- [#3861](https://github.com/assistant-ui/assistant-ui/pull/3861) [`9211d3d`](https://github.com/assistant-ui/assistant-ui/commit/9211d3dca917c25cce480fa26248e886bb5e0736) - fix: prevent duplicate "Used tool" cards when LangGraph emits `tool_call_chunks` with an empty `id` followed by a chunk with the real `id` at the same index. `appendLangChainChunk` now also merges by `index` when either side has an empty `id`, and the resulting entry keeps whichever `id` is non-empty. As a defense-in-depth, `convertLangChainMessages` also synthesizes a stable `lc-toolcall-${messageId}-${index}` id when a `tool_call` still arrives at the converter with an empty `id`. ([@okisdev](https://github.com/okisdev))

- [#3836](https://github.com/assistant-ui/assistant-ui/pull/3836) [`00a359d`](https://github.com/assistant-ui/assistant-ui/commit/00a359d6581c2f73708a1b4b2e3fe5f82c02ab55) - fix: tool call status briefly flickers `requires-action` (error icon) before settling on `complete` during LangGraph streaming with subgraphs. The final reconcile now merges the values snapshot with tuple-accumulated state instead of replacing it, so tool results and subgraph-internal messages aren't dropped; metadata survives reconcile; `isRunning` flips to `false` atomically with the final message update (via new `onComplete` callback); and subgraph-level `error` events (pipe-namespaced) no longer mark parent AI messages as incomplete. Pipe-separated subgraph event names (e.g. `messages|tools:call_abc`) are now handled by stripping the namespace before matching. ([@okisdev](https://github.com/okisdev))

- [#3848](https://github.com/assistant-ui/assistant-ui/pull/3848) [`f4762e7`](https://github.com/assistant-ui/assistant-ui/commit/f4762e70f0270f6e6466b1c6fb735e7423c885ab) - feat: add `unstable_createLangGraphStream` helper that builds a `stream` callback for `useLangGraphRuntime` with `config.abortSignal` and `onDisconnect: "cancel"` wired to `client.runs.stream`. ([@okisdev](https://github.com/okisdev))

- [#3842](https://github.com/assistant-ui/assistant-ui/pull/3842) [`3e8a67d`](https://github.com/assistant-ui/assistant-ui/commit/3e8a67dc4632f0e4e2a6e496f16637bfb1a81df9) - feat: add `unstable_threadListAdapter` option to `useLangGraphRuntime` for backing the thread list with a custom `RemoteThreadListAdapter` (e.g. one backed by `client.threads.search()`) without requiring assistant-cloud ([@okisdev](https://github.com/okisdev))

- [#3844](https://github.com/assistant-ui/assistant-ui/pull/3844) [`aa0d509`](https://github.com/assistant-ui/assistant-ui/commit/aa0d50986eaf034789843574f25367a73039b56f) - feat: expose subgraph (namespaced) events to `useLangGraphRuntime` / `useLangGraphMessages` callers. `onMessageChunk` now receives a `namespace` field in `tupleMetadata` for pipe-namespaced `messages|<subgraph>` events, and three new `eventHandlers` are available: `onSubgraphValues(namespace, values)`, `onSubgraphUpdates(namespace, updates)`, and `onSubgraphError(namespace, error)`. Previously `values|<ns>` and `updates|<ns>` events were silently dropped, and `error|<ns>` events could not be attributed to a specific subgraph. Fully additive: top-level `onValues` / `onUpdates` / `onError` behaviour is unchanged (including the existing guarantee that subgraph errors do not mark the parent message as incomplete). ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8

## 0.13.10

### Patch Changes

- 01d0dbe: feat(react-langgraph): support LangSmith Generative UI `ui_message`
  - Translate UI messages into `DataMessagePart`s on the associated assistant message, rendered via the existing `makeAssistantDataUI({ name, render })` API
  - Accumulate UI messages from both `custom` stream events (raw `{type:"ui"}` / `{type:"remove-ui"}`) and the `values.ui` state snapshot
  - Key UI entries by `ui.id`, shallow-merge props when `metadata.merge === true`, delete on `type:"remove-ui"`
  - Expose `uiStateKey` config option for graphs that customize the `typedUi` state key
  - Extend the `load` callback return type with `uiMessages` so persisted UI state can be restored on thread switch
  - Expose `useLangGraphUIMessages()` for accessing the raw UI message list
  - Export `UIMessage`, `RemoveUIMessage`, and `UseLangGraphRuntimeOptions` types

  **Behavior change:** `{type:"ui"}` / `{type:"remove-ui"}` payloads received on the `custom` stream channel are now intercepted by the adapter before reaching `eventHandlers.onCustomEvent`. Other custom events still reach the handler unchanged.

- c988db8: chore: update dependencies
- 8b51ffa: fix(react-langgraph): handle Bedrock tool_call_chunks with null id/name
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7

## 0.13.9

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - assistant-cloud@0.1.25

## 0.13.8

### Patch Changes

- 327e2ce: fix(react-langgraph): inject text part for attachment-only human messages
- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [dffb6b4]
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
- Updated dependencies [af70d7f]
  - assistant-stream@0.3.9
  - @assistant-ui/core@0.1.10
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6

## 0.13.7

### Patch Changes

- 52403c3: chore: update dependencies
- Updated dependencies [781f28d]
- Updated dependencies [3227e71]
- Updated dependencies [3227e71]
- Updated dependencies [0f55ce8]
- Updated dependencies [83a15f7]
- Updated dependencies [52403c3]
- Updated dependencies [ffa3a0f]
  - @assistant-ui/core@0.1.9
  - assistant-stream@0.3.8
  - assistant-cloud@0.1.23
  - @assistant-ui/store@0.2.5

## 0.13.6

### Patch Changes

- 736344c: chore: update dependencies
- c71cb58: chore: update dependencies
- Updated dependencies [1406aed]
- Updated dependencies [9480f30]
- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [ff3be2a]
- Updated dependencies [70b19f3]
- Updated dependencies [c71cb58]
  - @assistant-ui/core@0.1.8
  - @assistant-ui/store@0.2.4
  - assistant-stream@0.3.7

## 0.13.5

### Patch Changes

- e4bc32e: fix(react-langgraph): support messages from non-LLM LangGraph nodes via `updates` and `values` events
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7

## 0.13.4

### Patch Changes

- 349f3c7: chore: update deps
- 619d923: Depend on @assistant-ui/core instead of @assistant-ui/react
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-stream@0.3.6
  - assistant-cloud@0.1.22
  - @assistant-ui/store@0.2.3

## 0.13.3

### Patch Changes

- cbdc786: fix(react-langgraph): stabilize tool args serialization to avoid argsText rewrites
- a845911: chore: update dependencies
- e9ba6ab: fix(react-langgraph): handle tool_call_chunks with index 0
- 5232826: fix(react-langgraph): treat stream cancellation `AbortError` as a normal exit condition in `useLangGraphMessages` to avoid unhandled promise rejections when runs are cancelled.
- 3c58d63: fix(react-langgraph): send file attachments as flat LangGraph file blocks and accept both flat/legacy file formats
- 1eb059c: fix(react-langgraph): preserve tuple-stream accumulated messages by skipping updates snapshot replacement after tuple message events.
- Updated dependencies [07dcce0]
- Updated dependencies [a845911]
- Updated dependencies [bc40eaf]
- Updated dependencies [be23d74]
- Updated dependencies [1eb059c]
  - @assistant-ui/react@0.12.15

## 0.13.2

### Patch Changes

- 3892994: fix(react-langgraph): normalize messages-tuple events for Python LangGraph compatibility
- Updated dependencies [17cf9a8]
  - @assistant-ui/react@0.12.13

## 0.13.1

### Patch Changes

- 36ef3a2: chore: update dependencies
- 02c6f44: feat(react-langgraph): add `onEdit` and `onReload` support via `getCheckpointId` option

  Added `getCheckpointId` callback to `useLangGraphRuntime`. When provided, enables message editing (branching) and regeneration by resolving the appropriate LangGraph checkpoint ID for server-side forking. The checkpoint ID flows through to the `stream` callback via `LangGraphSendMessageConfig.checkpointId`.

  Also fixed a stale closure bug in `useLangGraphMessages` where the message accumulator could initialize with outdated messages when `setMessages` and `sendMessage` were called in the same React frame.

- e1d839e: feat(react-langgraph): support `additional_kwargs.metadata` in LangGraph message converter, mapping it to `ThreadMessage.metadata.custom`
- Updated dependencies [36ef3a2]
- Updated dependencies [6692226]
- Updated dependencies [c31c0fa]
- Updated dependencies [1672be8]
- Updated dependencies [28f39fe]
- Updated dependencies [3a1cb66]
- Updated dependencies [14769af]
- Updated dependencies [7c360ce]
- Updated dependencies [a638f05]
- Updated dependencies [8a78cd2]
  - assistant-stream@0.3.4
  - @assistant-ui/react@0.12.12

## 0.13.0

### Minor Changes

- 292eeda: feat(react-langgraph): support messages-tuple streaming metadata

  Add `onMessageChunk`, `onValues`, `onUpdates` callbacks and `useLangGraphMessageMetadata` hook for accessing tuple metadata from messages-tuple stream mode.

### Patch Changes

- Updated dependencies [5bbe8a9]
- Updated dependencies [5e304ea]
- Updated dependencies [546c053]
- Updated dependencies [a7039e3]
- Updated dependencies [16c10fd]
- Updated dependencies [98c3d54]
- Updated dependencies [b181803]
- Updated dependencies [7836760]
- Updated dependencies [9276547]
- Updated dependencies [b65428e]
- Updated dependencies [af5b085]
- Updated dependencies [61b54e9]
- Updated dependencies [a094c45]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [a247fc9]
- Updated dependencies [f414af9]
- Updated dependencies [b48912c]
- Updated dependencies [93910bd]
- Updated dependencies [58a8472]
  - @assistant-ui/react@0.12.11
  - assistant-stream@0.3.3

## 0.12.5

### Patch Changes

- afaaf3b: feat(react-langgraph): support frontend tool execution in LangGraph runtime
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [51d24be]
- Updated dependencies [afaaf3b]
  - @assistant-ui/react@0.12.10

## 0.12.4

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
- Updated dependencies [d8122cc]
  - assistant-stream@0.3.2
  - @assistant-ui/react@0.12.9

## 0.12.3

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
  - assistant-stream@0.3.1
  - @assistant-ui/react@0.12.5

## 0.12.2

### Patch Changes

- Updated dependencies [07d1c65]
- Updated dependencies [b591d72]
- Updated dependencies [59a338a]
- Updated dependencies [acbaf07]
- Updated dependencies [c665612]
- Updated dependencies [0371d72]
- Updated dependencies [e8b3f34]
  - @assistant-ui/react@0.12.3
  - assistant-stream@0.3.0

## 0.12.1

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [1ea3e28]
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
  - @assistant-ui/react@0.12.2
  - assistant-stream@0.2.48

## 0.7.15

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-stream@0.2.47
  - @assistant-ui/react@0.11.58

## 0.7.14

### Patch Changes

- 07ff0d7: fix(react-langgraph): trigger `loadThread` when switching threads
- Updated dependencies [ebd41c7]
- Updated dependencies [9a110ea]
- Updated dependencies [caee095]
- Updated dependencies [9883125]
  - @assistant-ui/react@0.11.57

## 0.7.13

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-stream@0.2.46
  - @assistant-ui/react@0.11.53

## 0.7.12

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
  - @assistant-ui/react@0.11.50
  - assistant-stream@0.2.45

## 0.7.11

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [ba26b22]
- Updated dependencies [d169e4f]
- Updated dependencies [da9f8a6]
- Updated dependencies [01c31fe]
  - @assistant-ui/react@0.11.48
  - assistant-stream@0.2.43

## 0.7.10

### Patch Changes

- ab8953b: feat(react): add `allowNesting` option to allow wrapping runtimes with custom thread list adapters
- Updated dependencies [ab8953b]
  - @assistant-ui/react@0.11.46

## 0.7.9

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - @assistant-ui/react@0.11.45

## 0.7.8

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - @assistant-ui/react@0.11.40

## 0.7.7

### Patch Changes

- b408005: feat(react-ai-sdk): Integrate AI SDK v5 data parts in message content
- Updated dependencies [b408005]
- Updated dependencies [7a6d9ca]
- Updated dependencies [70d5966]
- Updated dependencies [3754bdd]
- Updated dependencies [0a4bdc1]
  - @assistant-ui/react@0.11.39

## 0.7.6

### Patch Changes

- 2fc7e99: chore: update deps
- Updated dependencies [3ab9484]
- Updated dependencies [7a88ead]
- Updated dependencies [81b581f]
- Updated dependencies [2fc7e99]
  - @assistant-ui/react@0.11.36
  - assistant-stream@0.2.39

## 0.7.5

### Patch Changes

- bcb4636: feat(react-langgraph): add "file" content type (filename, file_data) with round-trip mapping
- Updated dependencies [2fc5c3d]
- Updated dependencies [04144dd]
  - assistant-stream@0.2.38
  - @assistant-ui/react@0.11.35

## 0.7.4

### Patch Changes

- 953db24: chore: update deps
- Updated dependencies [953db24]
- Updated dependencies
  - assistant-stream@0.2.37
  - @assistant-ui/react@0.11.34

## 0.7.3

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.36
  - @assistant-ui/react@0.11.31

## 0.7.2

### Patch Changes

- 5798f66: fix: handle full message arrays in Updates event
- Updated dependencies [92dfb0f]
  - @assistant-ui/react@0.11.29

## 0.7.1

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - assistant-stream@0.2.34
  - @assistant-ui/react@0.11.27

## 0.7.0

### Minor Changes

- c5188d9: feat: revamp langgraph thread management integration

### Patch Changes

- Updated dependencies [7a020fa]
- Updated dependencies [7a020fa]
- Updated dependencies [c5188d9]
  - @assistant-ui/react@0.11.21

## 0.6.11

### Patch Changes

- 8812f86: chore: update deps
- Updated dependencies [8812f86]
  - assistant-stream@0.2.30

## 0.6.10

### Patch Changes

- 9e03f7a: fix: Handle undefined extras in useLangGraphInterruptState

  Fixed an issue where useLangGraphInterruptState would throw errors when thread extras are undefined (e.g., with EMPTY_THREAD_CORE). The hook now safely returns undefined when extras are not available, and uses useAui for imperative operations in useLangGraphSend to avoid similar issues.

- Updated dependencies [94fcc39]
  - @assistant-ui/react@0.11.20

## 0.6.9

### Patch Changes

- 3ce485f: feat: add cancel handling and extend message types
- Updated dependencies [3ce485f]
  - @assistant-ui/react@0.11.13

## 0.6.8

### Patch Changes

- 0f21c70: fix: do not throw an error for unknown message part types
- 0f21c70: fix: merge multiple reasoning summaries
- Updated dependencies [0f21c70]
- Updated dependencies [0f21c70]
  - assistant-stream@0.2.26
  - @assistant-ui/react@0.11.8

## 0.6.7

### Patch Changes

- 3742def: feat: langgraph converter computer_call support
- Updated dependencies [8f6fb59]
- Updated dependencies [d318c83]
  - @assistant-ui/react@0.11.7

## 0.6.6

### Patch Changes

- 633ca4e: fix: argsText parsing

## 0.6.5

### Patch Changes

- 650865c: feat: rename argsText to partial_json in LangChainToolCall

## 0.6.4

### Patch Changes

- 7919352: fix: better partial tool call args parsing
- Updated dependencies [2e7a10f]
  - assistant-stream@0.2.25

## 0.6.3

### Patch Changes

- 287cd53: feat: LangChain reasoning support

## 0.6.2

### Patch Changes

- 072de1d: fix: incorrect use of aui.threadListItem()
- Updated dependencies [2e1815e]
  - @assistant-ui/react@0.11.3

## 0.6.1

### Patch Changes

- 2d46069: chore: drop deprecated renamed fields
- Updated dependencies [2d46069]
  - @assistant-ui/react@0.11.2

## 0.6.0

### Patch Changes

- 5437dbe: feat: runtime rearchitecture (unified state API)
- Updated dependencies [39ac2f3]
- Updated dependencies [5437dbe]
  - @assistant-ui/react@0.11.0

## 0.5.12

### Patch Changes

- 12e0a77: chore: update deps
- Updated dependencies [12e0a77]
  - assistant-stream@0.2.23
  - @assistant-ui/react@0.10.42

## 0.5.11

### Patch Changes

- 0f063e0: chore: update dependencies
- Updated dependencies [0f063e0]
- Updated dependencies [5d8b074]
  - assistant-stream@0.2.22
  - @assistant-ui/react@0.10.34

## 0.5.10

### Patch Changes

- 5582547: fix: support for langgraph error events
- Updated dependencies [e359ffc]
- Updated dependencies [20a4649]
- Updated dependencies [2561cc0]
- Updated dependencies [9793e64]
  - @assistant-ui/react@0.10.26
  - assistant-stream@0.2.19

## 0.5.9

### Patch Changes

- 65b3ff1: chore: update deps
- 67611d8: fix: reset interrupt state in useLangGraphRuntime hook
- Updated dependencies [65b3ff1]
- Updated dependencies [2731323]
- Updated dependencies [308afff]
- Updated dependencies [cc9f567]
- Updated dependencies [c380f37]
  - assistant-stream@0.2.18
  - @assistant-ui/react@0.10.25

## 0.5.8

### Patch Changes

- 644abb8: chore: update deps
- Updated dependencies [b65e354]
- Updated dependencies [8eda24b]
- Updated dependencies [644abb8]
  - @assistant-ui/react@0.10.24
  - assistant-stream@0.2.17

## 0.5.7

### Patch Changes

- 39261db: fix: langchain-community bedrock anthropic support
- 1556c03: feat: Add support for event handlers for metadata, info, error, and custom events to useLangGraphMessages and useLangGraphRuntime
- Updated dependencies [57b5735]
  - @assistant-ui/react@0.10.21

## 0.5.6

### Patch Changes

- a6821cc: feat: LangGraph AIMessageChunk support
- Updated dependencies [8aa3020]
- Updated dependencies [f69ca69]
  - @assistant-ui/react@0.10.20

## 0.5.5

### Patch Changes

- 52e18bc: feat: langgraph human tool call artifact/isError support
- 52e18bc: fix: add support for artifact and isError for langgraph tool calls
- Updated dependencies [d0867eb]
- Updated dependencies [52e18bc]
- Updated dependencies [52e18bc]
- Updated dependencies [52e18bc]
  - @assistant-ui/react@0.10.19
  - assistant-stream@0.2.14

## 0.5.4

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.10
  - @assistant-ui/react@0.10.12

## 0.5.3

### Patch Changes

- 98a680e: chore: update deps
- Updated dependencies [98a680e]
- Updated dependencies [98a680e]
  - @assistant-ui/react@0.10.4
  - assistant-stream@0.2.4

## 0.5.2

### Patch Changes

- fix: ESM without bundler compat
- Updated dependencies
  - @assistant-ui/react@0.10.2

## 0.5.1

### Patch Changes

- fix: correctly include Typescript declarations
- Updated dependencies
  - @assistant-ui/react@0.10.1

## 0.5.0

### Patch Changes

- 557c3f7: build: drop CJS builds
- Updated dependencies [557c3f7]
  - @assistant-ui/react@0.9.7

## 0.4.5

### Patch Changes

- chore: update deps
- Updated dependencies
  - @assistant-ui/react@0.9.6

## 0.4.4

### Patch Changes

- chore: bump assistant-stream dependency
- Updated dependencies
- Updated dependencies [1ad0696]
  - @assistant-ui/react@0.9.5

## 0.4.3

### Patch Changes

- b9c731a: chore: update dependencies
- Updated dependencies [62c2af7]
- Updated dependencies [b9c731a]
  - @assistant-ui/react@0.9.3

## 0.4.2

### Patch Changes

- c0c9422: feat: useToolArgsFieldStatus
- Updated dependencies [553bdff]
- Updated dependencies [c0c9422]
- Updated dependencies [675fb20]
- Updated dependencies [4e86ab4]
- Updated dependencies [e893985]
- Updated dependencies [0500584]
  - @assistant-ui/react@0.9.2

## 0.4.1

### Patch Changes

- chore: update deps
- Updated dependencies
  - @assistant-ui/react@0.9.1

## 0.4.0

### Patch Changes

- afae5c9: refactor!: drop deprecated unstable_allowImageAttachments

## 0.3.2

### Patch Changes

- 4065dae: feat: artifact support

## 0.3.1

### Patch Changes

- 39aecd7: chore: update dependencies
- Updated dependencies [a22bc7a]
- Updated dependencies [39aecd7]
  - @assistant-ui/react@0.8.18

## 0.3.0

### Minor Changes

- a513099: chore: update langgraph package

### Patch Changes

- Updated dependencies
  - @assistant-ui/react@0.8.5

## 0.2.6

### Patch Changes

- feat: LangGraphMessageAccumulator

## 0.2.5

### Patch Changes

- a787c39: feat: LangGraph interrupt persistence support

## 0.2.4

### Patch Changes

- 72e66db: chore: update dependencies
- Updated dependencies [72e66db]
  - @assistant-ui/react@0.7.71

## 0.2.3

### Patch Changes

- 4f5d77f: feat: ToolCallMessagePart.args should be JSONObject
- Updated dependencies [8ec1f07]
- Updated dependencies [4f5d77f]
- Updated dependencies [8ec1f07]
  - @assistant-ui/react@0.7.59

## 0.2.2

### Patch Changes

- fix: improved interrupt+Command support
- Updated dependencies
- Updated dependencies
- Updated dependencies [2713487]
  - @assistant-ui/react@0.7.46

## 0.2.1

### Patch Changes

- 177bcce: feat: interrupt state stream support
- Updated dependencies [9934aef]
- Updated dependencies [3a8b55a]
  - @assistant-ui/react@0.7.45

## 0.1.18

### Patch Changes

- 22272e6: chore: update dependencies
- Updated dependencies [0979334]
- Updated dependencies [22272e6]
  - @assistant-ui/react@0.7.39

## 0.1.17

### Patch Changes

- 9dfa127: refactor: rewrite message stream parser
- Updated dependencies [5794b1b]
  - @assistant-ui/react@0.7.38

## 0.1.16

### Patch Changes

- 345f3d5: chore: update dependencies
- Updated dependencies [345f3d5]
- Updated dependencies [345f3d5]
- Updated dependencies [2846559]
  - @assistant-ui/react@0.7.35

## 0.1.15

### Patch Changes

- feat: Feedback and Speech adapter support

## 0.1.14

### Patch Changes

- 4c2bf58: chore: update dependencies
- Updated dependencies [9a3dc93]
- Updated dependencies [4c2bf58]
  - @assistant-ui/react@0.7.34

## 0.1.13

### Patch Changes

- fix: missing type for abortSignal

## 0.1.12

### Patch Changes

- 982a6a2: chore: update dependencies
- Updated dependencies [982a6a2]
  - @assistant-ui/react@0.7.30

## 0.1.11

### Patch Changes

- 392188c: fix: wrong import path causing crash
- Updated dependencies [a8ac203]
  - @assistant-ui/react@0.7.28

## 0.1.10

### Patch Changes

- 18c21b2: feat: cancellation support
- Updated dependencies [528cfd3]
- Updated dependencies [3c70ea1]
  - @assistant-ui/react@0.7.27

## 0.1.9

### Patch Changes

- 738ef3c: feat: manually trigger langgraph sends via useLangGraphRuntimeSend
- 738ef3c: feat: support for Command
- 738ef3c: feat: interrupt+Command support via useLangGraphRuntimeSendCommand
- Updated dependencies [6a17ec2]
  - @assistant-ui/react@0.7.26

## 0.1.8

### Patch Changes

- ec3b8cc: chore: update dependencies
- Updated dependencies [ec3b8cc]
  - @assistant-ui/react@0.7.19

## 0.1.7

### Patch Changes

- 4c54273: chore: update dependencies
- Updated dependencies [4c54273]
- Updated dependencies [4c54273]
  - @assistant-ui/react@0.7.12

## 0.1.6

### Patch Changes

- 2112ce8: chore: update dependencies
- Updated dependencies [589d37b]
- Updated dependencies [2112ce8]
  - @assistant-ui/react@0.7.8

## 0.1.5

### Patch Changes

- 933b8c0: chore: update deps
- Updated dependencies [933b8c0]
- Updated dependencies [09a2a38]
  - @assistant-ui/react@0.7.6

## 0.1.4

### Patch Changes

- c59d8b5: chore: update dependencies
- Updated dependencies [c59d8b5]
  - @assistant-ui/react@0.7.5

## 0.1.3

### Patch Changes

- b63fff1: feat: pass a string instead of an array content for text-only messages
- Updated dependencies [5462390]
- Updated dependencies [0fb80c1]
  - @assistant-ui/react@0.7.4

## 0.1.2

### Patch Changes

- 147a8a2: fix: types for adapters
- Updated dependencies [0dcd9cf]
  - @assistant-ui/react@0.7.3

## 0.1.1

### Patch Changes

- ba3ea31: feat: AttachmentAdapter support

## 0.1.0

### Patch Changes

- Updated dependencies [c6e886b]
- Updated dependencies [2912fda]
  - @assistant-ui/react@0.7.0

## 0.0.25

### Patch Changes

- 1ada091: chore: update deps
- Updated dependencies [cdcfe1e]
- Updated dependencies [cdcfe1e]
- Updated dependencies [94feab2]
- Updated dependencies [472c548]
- Updated dependencies [14da684]
- Updated dependencies [1ada091]
  - @assistant-ui/react@0.5.99

## 0.0.24

### Patch Changes

- ff5b86c: chore: update deps
- Updated dependencies [ff5b86c]
- Updated dependencies [ff5b86c]
- Updated dependencies [ff5b86c]
  - @assistant-ui/react@0.5.98

## 0.0.23

### Patch Changes

- d2375cd: build: disable bundling in UI package releases
- Updated dependencies [d2375cd]
  - @assistant-ui/react@0.5.93

## 0.0.22

### Patch Changes

- fb32e61: chore: update deps
- fb32e61: feat: react-19 support
- Updated dependencies [2090544]
- Updated dependencies [be04b5b]
- Updated dependencies [2090544]
- Updated dependencies [fb32e61]
- Updated dependencies [fb32e61]
  - @assistant-ui/react@0.5.90

## 0.0.21

### Patch Changes

- 359db5c: fix: hook dependency array inside useLangGraphMessages

## 0.0.20

### Patch Changes

- fix(langgraph): use correct image_url format

## 0.0.19

### Patch Changes

- feat(langgraph): image attachment support

## 0.0.18

### Patch Changes

- fix(langgraph): ignore tool_use message parts

## 0.0.17

### Patch Changes

- 851c10a: fix(langgraph): message part type check should output the content type

## 0.0.16

### Patch Changes

- ea90b84: fix(langgraph): allow complex content in ai messages
- Updated dependencies [0a3bd06]
  - @assistant-ui/react@0.5.77

## 0.0.15

### Patch Changes

- c3806f8: fix: do not export internal Runtime types
- Updated dependencies [c3806f8]
- Updated dependencies [899b963]
- Updated dependencies [899b963]
- Updated dependencies [899b963]
- Updated dependencies [8c80f2a]
- Updated dependencies [809c5c1]
  - @assistant-ui/react@0.5.76

## 0.0.14

### Patch Changes

- ce93e73: feat: handle MessageContentComplex types
- Updated dependencies [3d31f10]
- Updated dependencies [cf872da]
  - @assistant-ui/react@0.5.74

## 0.0.13

### Patch Changes

- fb46305: chore: update dependencies
- Updated dependencies [fb46305]
- Updated dependencies [e225116]
- Updated dependencies [0ff22a7]
- Updated dependencies [378ee99]
- Updated dependencies [378ee99]
  - @assistant-ui/react@0.5.73

## 0.0.12

### Patch Changes

- ff1f478: chore: update

## 0.0.11

### Patch Changes

- 0a8202e: fix: tool UI result can arrive before assistant message is marked as complete

## 0.0.10

### Patch Changes

- 51c5dff: fix: LangGraph python compatibility

## 0.0.9

### Patch Changes

- 88957ac: feat: New unified Runtime API (part 1/n)
- Updated dependencies [88957ac]
- Updated dependencies [1a99132]
- Updated dependencies [3187013]
  - @assistant-ui/react@0.5.61

## 0.0.8

### Patch Changes

- 155d6e7: chore: update dependencies
- Updated dependencies [926dce5]
- Updated dependencies [155d6e7]
- Updated dependencies [f80226f]
  - @assistant-ui/react@0.5.60

## 0.0.7

### Patch Changes

- e4863bb: feat(langgraph): add support for switching threads
- Updated dependencies [e4863bb]
- Updated dependencies [e4863bb]
  - @assistant-ui/react@0.5.56

## 0.0.6

### Patch Changes

- c348553: chore: update dependencies
- Updated dependencies [0f99aa6]
- Updated dependencies [c348553]
  - @assistant-ui/react@0.5.54

## 0.0.5

### Patch Changes

- 934758b: feat: automatically cancel tool calls if user sends a new message

## 0.0.4

### Patch Changes

- 184d836: feat: allow multiple message sends to support pending tool call cancellations

## 0.0.3

### Patch Changes

- c1c0440: refactor: rename to useLangGraphRuntime
- Updated dependencies [164e46c]
- Updated dependencies [5eccae7]
  - @assistant-ui/react@0.5.51

## 0.0.2

### Patch Changes

- 04f6fc8: chore: update deps
- Updated dependencies [04f6fc8]
  - @assistant-ui/react@0.5.50

## 0.0.1

### Patch Changes

- 5c1ca35: feat: initial release
- Updated dependencies [fb8e58f]
  - @assistant-ui/react@0.5.45
