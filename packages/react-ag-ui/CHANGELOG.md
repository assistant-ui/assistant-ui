# @assistant-ui/react-ag-ui

## 0.0.41

### Patch Changes

- [#4414](https://github.com/assistant-ui/assistant-ui/pull/4414) [`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c) - chore: import `generateId` and `fromThreadMessageLike` from the public `@assistant-ui/core` entry instead of `/internal` ([@okisdev](https://github.com/okisdev))

  no behavior change; these utilities are now part of the public API.

- Updated dependencies [[`344f737`](https://github.com/assistant-ui/assistant-ui/commit/344f7370511f7238db17e1982f2a43a10829604c), [`a2e21ee`](https://github.com/assistant-ui/assistant-ui/commit/a2e21ee797761907db9b7e4559da2a41afd00fc9)]:
  - @assistant-ui/core@0.2.17

## 0.0.40

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`434bba5`](https://github.com/assistant-ui/assistant-ui/commit/434bba5f7c59ab7cf6f1c78a8898fd4d3addb12d), [`4cc7eaa`](https://github.com/assistant-ui/assistant-ui/commit/4cc7eaac61d68ae970b998465bb7e5c722cc9dda)]:
  - assistant-stream@0.3.23
  - @assistant-ui/core@0.2.16

## 0.0.39

### Patch Changes

- [#4381](https://github.com/assistant-ui/assistant-ui/pull/4381) [`f9db6ca`](https://github.com/assistant-ui/assistant-ui/commit/f9db6cac4dd69131c4b6668da170e742302d48cd) - feat: accept any AbstractAgent in useAgUiRuntime instead of requiring HttpAgent ([@dkachur1](https://github.com/dkachur1))

- [#4380](https://github.com/assistant-ui/assistant-ui/pull/4380) [`6f2f687`](https://github.com/assistant-ui/assistant-ui/commit/6f2f68761088b857334e005b01d835ffc10d1f05) - feat: forward the full ExternalStoreThreadListAdapter (threads, archivedThreads, onRename, onArchive, ...) through adapters.threadList so server-persisted threads can be registered and switched to; clear messages before onSwitchToThread so the previous thread's messages no longer merge in as a phantom sibling branch; onSwitchToThread can return unstable_resume to reattach to an in-flight run after switching (resumes in the background and requires a ThreadHistoryAdapter with resume(), otherwise it reports through onError instead of re-running the agent) ([@dkachur1](https://github.com/dkachur1))

- [#4362](https://github.com/assistant-ui/assistant-ui/pull/4362) [`64a6566`](https://github.com/assistant-ui/assistant-ui/commit/64a6566eea3b97735194c04b61724bd1a6b7f2dc) - fix: attach a TOOL_CALL_RESULT for a prior run's tool call to its owning message instead of synthesizing a duplicate empty-args part ([@dkachur1](https://github.com/dkachur1))

- [#4382](https://github.com/assistant-ui/assistant-ui/pull/4382) [`fa89168`](https://github.com/assistant-ui/assistant-ui/commit/fa89168083cb87e9044d8683625723bc6e629b9e) - fix: keep failed and aborted runs visible. the synthetic RUN_FINISHED from onRunFinalized used to overwrite RUN_ERROR with a successful status, so failed runs rendered as complete and MessagePrimitive.Error never showed. aborts (which @ag-ui/client routes through onRunFailed) now map to RUN_CANCELLED instead of RUN_ERROR, so the run lands as incomplete/cancelled. ([@dkachur1](https://github.com/dkachur1))

- Updated dependencies [[`c207bcd`](https://github.com/assistant-ui/assistant-ui/commit/c207bcda24468c1ae6e5adb61054a3682d3ff1d8), [`ae59baf`](https://github.com/assistant-ui/assistant-ui/commit/ae59baf3bb9b1779f403d378aca19bb3d83781ff), [`4583ca7`](https://github.com/assistant-ui/assistant-ui/commit/4583ca7477c834ef0906e7268005b469c7300cbe), [`94cc028`](https://github.com/assistant-ui/assistant-ui/commit/94cc02875b4e813e1af7020709511bb5f61e6067)]:
  - @assistant-ui/core@0.2.15
  - assistant-stream@0.3.22

## 0.0.38

### Patch Changes

- [#4321](https://github.com/assistant-ui/assistant-ui/pull/4321) [`f5e183b`](https://github.com/assistant-ui/assistant-ui/commit/f5e183bde86b96d5c0a885f59ed9d449c56e40e7) - feat: restore multimodal user input (`image`, `audio`, `video`, `document`, and legacy `binary` parts) as attachments in `fromAgUiMessages`, so persisted conversations reload attachments instead of dropping them and re-send them on the next run ([@dkachur1](https://github.com/dkachur1))

- Updated dependencies [[`ab8e5bc`](https://github.com/assistant-ui/assistant-ui/commit/ab8e5bc8650b1e39c8f01ab6c0efb80aa8baf723), [`59d252f`](https://github.com/assistant-ui/assistant-ui/commit/59d252fa09c1511acd7e31c9d8178514c5a5cb77), [`feecac3`](https://github.com/assistant-ui/assistant-ui/commit/feecac38c6ba0f8f30ec356376d1d6b19188e08f), [`5a4f20e`](https://github.com/assistant-ui/assistant-ui/commit/5a4f20e75dcd93aeb70a4a5582a0a5a1f870b4f2), [`f10b8ae`](https://github.com/assistant-ui/assistant-ui/commit/f10b8ae6659ed8df8b0c25b5bb2bb8cfa7d7a718), [`1fb5862`](https://github.com/assistant-ui/assistant-ui/commit/1fb586241534064fa48e3498f422bdaa7f382139)]:
  - @assistant-ui/core@0.2.14

## 0.0.37

### Patch Changes

- [#4317](https://github.com/assistant-ui/assistant-ui/pull/4317) [`89e603e`](https://github.com/assistant-ui/assistant-ui/commit/89e603e4ec93bb22085e7b9c0127615d97341e3e) - fix: mark the streaming assistant placeholder with `metadata.isOptimistic` so the message repository evicts it after the client→server id swap, instead of leaving a phantom empty sibling branch on every run ([@dkachur1](https://github.com/dkachur1))

- Updated dependencies [[`60ef0e9`](https://github.com/assistant-ui/assistant-ui/commit/60ef0e9ed26ceab722468332ff93c4751cc631fb), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b), [`1b6a0d6`](https://github.com/assistant-ui/assistant-ui/commit/1b6a0d6ae40b343b233c8c12ab119b13c43cb69b)]:
  - @assistant-ui/core@0.2.13

## 0.0.36

### Patch Changes

- [#4278](https://github.com/assistant-ui/assistant-ui/pull/4278) [`a4d9836`](https://github.com/assistant-ui/assistant-ui/commit/a4d9836d0ef6839b5ebe3255cd91a762ce8492d2) - feat: consume ACTIVITY_SNAPSHOT events to support MCP Apps on the AG-UI runtime ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4264](https://github.com/assistant-ui/assistant-ui/pull/4264) [`11f2321`](https://github.com/assistant-ui/assistant-ui/commit/11f23214b00541fa0ff15434f19c4130b0e94df1) - feat: export `fromAgUiMessages` from the package root ([@serhiizghama](https://github.com/serhiizghama))

  Converting persisted AG-UI messages to assistant-ui messages (e.g. when
  restoring a conversation from a `GET /agents/state` endpoint on page load)
  previously required reaching into package internals. `fromAgUiMessages` is now
  a public export, typed to return `ThreadMessageLike[]` so its output plugs
  directly into `ExportedMessageRepository.fromArray` inside a history adapter.

- [#4233](https://github.com/assistant-ui/assistant-ui/pull/4233) [`465f264`](https://github.com/assistant-ui/assistant-ui/commit/465f264322acedb61e5a5ea386383eb68accd097) - fix: import AG-UI `reasoning` messages from `MESSAGES_SNAPSHOT` ([@dkachur1](https://github.com/dkachur1))

  `fromAgUiMessages` only branched on `tool`/`assistant`/`user`/`system`, so
  `reasoning` messages in a `MESSAGES_SNAPSHOT` were silently dropped on cold
  reload even though the live `REASONING_*` (and deprecated `THINKING_*`) path
  already surfaces them. They are now converted faithfully to a `reasoning`
  assistant part. `activity` messages carry a structured payload with no
  assistant-ui message-part equivalent and remain intentionally unmapped.

- [#4232](https://github.com/assistant-ui/assistant-ui/pull/4232) [`a16baa8`](https://github.com/assistant-ui/assistant-ui/commit/a16baa8020930b149159d6c7f24ed3f5426195a5) - feat: emit AG-UI multimodal input parts (image/audio/video/document with typed data/url sources) for file attachments instead of the legacy `binary` input content ([@dkachur1](https://github.com/dkachur1))

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518), [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867), [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045)]:
  - @assistant-ui/core@0.2.11
  - assistant-stream@0.3.21

## 0.0.35

### Patch Changes

- [#4241](https://github.com/assistant-ui/assistant-ui/pull/4241) [`b94f545`](https://github.com/assistant-ui/assistant-ui/commit/b94f545e688ae97ead230c75b82bc1b977487ffd) - fix: preserve frontend tool results and auto-continue when they resolve before RUN_FINISHED ([@Yonom](https://github.com/Yonom))

- [#4224](https://github.com/assistant-ui/assistant-ui/pull/4224) [`f086497`](https://github.com/assistant-ui/assistant-ui/commit/f08649741273e9eb5a09d144feb3fccd8ec2aa71) - feat(react-ag-ui): honor `CreateResumeRunConfig.stream` in `AgUiThreadRuntimeCore` ([@dkachur1](https://github.com/dkachur1))

  `resume()` previously logged `resume stream is not supported` and fell back to a fresh `agent.runAgent(...)`, re-running the agent on every resume. It now passes the resume generator into `startRun`, which replays each `ChatModelRunResult` into the existing assistant message (no new `runId`, no replayed `agent.runAgent`). On history `load()` with `unstable_resume`, the adapter now feeds `history.resume()` when present (falling back to a fresh run otherwise), and `ResumeRunConfig.stream` is typed as the real `(options: ChatModelRunOptions) => AsyncGenerator<ChatModelRunResult, void, unknown>` instead of `unknown`. This lets apps that persist their own AG-UI event stream re-attach and continue consuming on reload.

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4210](https://github.com/assistant-ui/assistant-ui/pull/4210) [`8dc2e0d`](https://github.com/assistant-ui/assistant-ui/commit/8dc2e0d295118f2b37bd14c854aeb4f092e59c60) - feat(react-ag-ui): apply AG-UI STATE_DELTA events ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/core@0.2.10

## 0.0.34

### Patch Changes

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4135](https://github.com/assistant-ui/assistant-ui/pull/4135) [`e7c2396`](https://github.com/assistant-ui/assistant-ui/commit/e7c2396a6a212404657e9b537add0b5534fe807c) - align the runtime wrapper hooks so every distribution forwards the same set of optional adapter-level fields to `useExternalStoreRuntime`. closes [#4134](https://github.com/assistant-ui/assistant-ui/issues/4134). ([@okisdev](https://github.com/okisdev))

  `useChatRuntime` and `useAISDKRuntime` (which already accepted `suggestions`) gain three new options:
  - `isDisabled`, disables the composer input entirely.
  - `isSendDisabled`, keeps the input usable but makes `send()` a no-op (paired with `composer.canSend`).
  - `unstable_capabilities`, per-thread capability overrides (currently `{ copy?: boolean }`).

  `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime` gain all four (the three above plus `suggestions`).

  adapter-level additions, where missing:
  - `useChatRuntime` / `useAISDKRuntime` already accepted `dictation` and `voice` through the `ExternalStoreAdapter` adapter shape; this just confirms the typing.
  - `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime` now accept `dictation` and `voice` in their `adapters` object and forward them through.
  - `useOpenCodeRuntime` gains an `adapters` option for the first time (attachments / speech / dictation / voice / feedback).

  every new field is optional and defaults to the prior behavior, so existing call sites need no changes.

- [#4133](https://github.com/assistant-ui/assistant-ui/pull/4133) [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652) - forward per-tool `providerOptions` from `useAssistantTool` through `toToolsJSONSchema` and `frontendTools` into the AI SDK request body, and emit tool entries in alphabetical order so identical tool sets produce byte-identical request bodies for stable prompt caching. `react-ag-ui` inherits the sort via `toAgUiTools`, so identical tool sets reach the AG-UI runtime in a stable order regardless of mount order. ([@okisdev](https://github.com/okisdev))

  this lets you opt into provider-specific tool features (e.g. Anthropic's `defer_loading`, Anthropic Tool Search Tool) without any provider-aware code in assistant-ui:

  ```ts
  useAssistantTool({
    toolName: "get_weather",
    parameters: schema,
    providerOptions: { anthropic: { deferLoading: true } },
    execute: async ({ city }) => fetchWeather(city),
  });
  ```

  the value is passed through verbatim; the AI SDK provider (`@ai-sdk/anthropic`, `@ai-sdk/openai`, ...) interprets it.

- [#4128](https://github.com/assistant-ui/assistant-ui/pull/4128) [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8

## 0.0.33

### Patch Changes

- [#4125](https://github.com/assistant-ui/assistant-ui/pull/4125) [`e639a11`](https://github.com/assistant-ui/assistant-ui/commit/e639a11838642aa111644077ba51acf6277051f2) - chore: drop tracker-behaviour explainer comments left behind in satellite runtimes ([@Yonom](https://github.com/Yonom))

## 0.0.32

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5

## 0.0.31

### Patch Changes

- [#4066](https://github.com/assistant-ui/assistant-ui/pull/4066) [`3bc6dc0`](https://github.com/assistant-ui/assistant-ui/commit/3bc6dc0c407dfc19d7654c75efa22c45cf11d6d0) - fix(react-ag-ui): preserve arrival order of parts in RunAggregator ([@tlecomte](https://github.com/tlecomte))

  The aggregator now strictly preserves the order events arrive from the upstream stream. Each `REASONING_START`, `TOOL_CALL_START`, and `TEXT_MESSAGE_END` acts as a boundary that closes the current active part, so consecutive events of the same type are grouped into one part while interleaved events of a different type produce separate parts in chronological order.

  Previously, the first reasoning block was always moved before the first text part regardless of arrival order, and multiple reasoning cycles were merged into a single block. Both behaviours have been removed.

- [#3925](https://github.com/assistant-ui/assistant-ui/pull/3925) [`53cdc51`](https://github.com/assistant-ui/assistant-ui/commit/53cdc51665a48dfeb0220455f6c32a34981e0b0e) - feat(react-ag-ui): track streaming timing on the run aggregator so `useMessageTiming()` works on AG-UI assistant messages ([@shashank-100](https://github.com/shashank-100))

- Updated dependencies [[`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47), [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd), [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917), [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd)]:
  - assistant-stream@0.3.15
  - @assistant-ui/core@0.2.3

## 0.0.30

### Patch Changes

- [#3974](https://github.com/assistant-ui/assistant-ui/pull/3974) [`1959f3a`](https://github.com/assistant-ui/assistant-ui/commit/1959f3ad9ac5da430e1882439cc64f0853a39d6a) - feat(react-ag-ui): surface AG-UI interrupt-aware run lifecycle ([@okisdev](https://github.com/okisdev))

  `event-parser` reads the optional `outcome` on `RUN_FINISHED` and forwards both `success` and `interrupt` variants; the subscriber subscribes to `onRunFinishedEvent` (with `onRunFinalized` as a fallback for older servers). `RunAggregator` maps `outcome.type === "interrupt"` to `requires-action` with `reason: "interrupt"` and writes the interrupts to `metadata.custom.agui.interrupts`. `useAgUiRuntime` returns an `AgUiAssistantRuntime` augmented with `unstable_getPendingInterrupts` and `unstable_submitInterruptResponses`; the latter validates coverage and expiry on the client, then issues a fresh run with `RunAgentInput.resume` populated. the runtime state snapshot is also synced onto the agent before each run so `state` actually reaches the protocol layer.

- [#3977](https://github.com/assistant-ui/assistant-ui/pull/3977) [`876abd1`](https://github.com/assistant-ui/assistant-ui/commit/876abd124854b864ef0ba4ea6b9e67a82bc743c0) - feat(react-ag-ui): tighten interrupt lifecycle ([@okisdev](https://github.com/okisdev))

  `append`, `reload`, and `resume` now refuse to start a new run while interrupts are still pending on the thread; the call throws with a message pointing at `submitInterruptResponses` instead of letting the request hit the wire and rely on the agent to reject it (AG-UI interrupts spec rule 4).

  `AgUiInterrupt.reason` is typed as `AgUiInterruptReason` (`"tool_call" | "input_required" | "confirmation" | (string & {})`), so the spec values autocomplete while string extension stays open.

  `onRunFinishedEvent` now ignores payloads that parse as a different event type, so a misrouted callback can no longer suppress the `onRunFinalized` fallback.

- [#4017](https://github.com/assistant-ui/assistant-ui/pull/4017) [`1802e08`](https://github.com/assistant-ui/assistant-ui/commit/1802e08fe86567125d8ef013d7bc9a5c10e0b022) - fix(react-ag-ui): adopt `TEXT_MESSAGE_START.messageId` as the assistant `ThreadMessage.id` ([@okisdev](https://github.com/okisdev))

  `AgUiThreadRuntimeCore` now inserts the assistant placeholder under an optimistic id (`generateOptimisticId`), then atomically reassigns the message id to the server-supplied `messageId` the first time `RunAggregator` observes one (on `TEXT_MESSAGE_START`, `TEXT_MESSAGE_CONTENT`, `TEXT_MESSAGE_END`, or `TOOL_CALL_START.parentMessageId`). `assistantHistoryParents` and `recordedHistoryIds` migrate with the id, so `persistAssistantHistory`, `addToolResult`, and downstream lookups keep working and resolve to the canonical AG-UI id. This brings the streaming path in line with `MESSAGES_SNAPSHOT` imports, which were already keyed on the server id.

  `TOOL_CALL_RESULT.messageId` is now surfaced as `unstable_toolMessageId` on the tool-call part, so tool messages round-trip back to AG-UI with their original id instead of a synthetic `${toolCallId}:tool` value.

- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07), [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1), [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3), [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930)]:
  - assistant-stream@0.3.14
  - @assistant-ui/core@0.2.1

## 0.0.29

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.0.28

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13

## 0.0.27

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12

## 0.0.26

### Patch Changes

- 43fb4f7: fix(react-ag-ui): preserve user message attachments when converting to AG-UI format
  - `toAgUiMessages()` previously called `extractText()` for user messages, silently dropping image and file attachments
  - User messages with attachments now emit AG-UI `InputContent[]`: images map to the `image` variant with a `data` or `url` source, files map to the `binary` variant preserving `filename`
  - Falls back to plain string `content` when no binary parts are present, preserving backward compatibility

- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11

## 0.0.25

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13

## 0.0.24

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [dffb6b4]
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [af70d7f]
  - assistant-stream@0.3.9
  - @assistant-ui/core@0.1.10

## 0.0.23

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

## 0.0.22

### Patch Changes

- 736344c: chore: update dependencies
- Updated dependencies [1406aed]
- Updated dependencies [9480f30]
- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [ff3be2a]
- Updated dependencies [70b19f3]
  - @assistant-ui/core@0.1.8
  - assistant-stream@0.3.7

## 0.0.21

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

## 0.0.20

### Patch Changes

- 164ff4e: fix(react-ag-ui): preserve tool message id through AgUiMessage conversion round-trip
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
  - @assistant-ui/react@0.12.16

## 0.0.19

### Patch Changes

- a845911: chore: update dependencies
- a8983ae: fix(react-ag-ui): add REASONING\_\* event support to match @ag-ui/client v0.0.45
- c482ca2: fix(react-ag-ui): correctly import `MESSAGES_SNAPSHOT` events that include `role: "tool"` messages by normalizing them into assistant tool-call results before core conversion.
- Updated dependencies [07dcce0]
- Updated dependencies [a845911]
- Updated dependencies [bc40eaf]
- Updated dependencies [be23d74]
- Updated dependencies [1eb059c]
  - @assistant-ui/react@0.12.15

## 0.0.18

### Patch Changes

- 36ef3a2: chore: update dependencies
- 8c29377: fix(react-ag-ui): route tool results to the latest pending tool call and avoid false auto-resume triggers
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

## 0.0.17

### Patch Changes

- 88ec552: fix(react-ag-ui): auto-resume run after frontend tool execution completes
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

## 0.0.16

### Patch Changes

- afaaf3b: feat(react-ag-ui): support frontend tool execution in AG-UI runtime
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [51d24be]
- Updated dependencies [afaaf3b]
  - @assistant-ui/react@0.12.10

## 0.0.15

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
- Updated dependencies [d8122cc]
  - assistant-stream@0.3.2
  - @assistant-ui/react@0.12.9

## 0.0.14

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
  - assistant-stream@0.3.1
  - @assistant-ui/react@0.12.5

## 0.0.13

### Patch Changes

- a888c9b: feat(react-ag-ui): add experimental switch new thread

## 0.0.12

### Patch Changes

- acbaf07: feat: add framework-agnostic `toToolsJSONSchema` and `toGenericMessages` utilities to `assistant-stream`
- Updated dependencies [07d1c65]
- Updated dependencies [b591d72]
- Updated dependencies [59a338a]
- Updated dependencies [acbaf07]
- Updated dependencies [c665612]
- Updated dependencies [0371d72]
- Updated dependencies [e8b3f34]
  - @assistant-ui/react@0.12.3
  - assistant-stream@0.3.0

## 0.0.11

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [1ea3e28]
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
  - @assistant-ui/react@0.12.2
  - assistant-stream@0.2.48

## 0.0.10

### Patch Changes

- c7b7897: fix(react-ag-ui): load history on runtime initialization
- 7073ccc: fix(react-ag-ui): use `threadId` instead of hardcoded `main`
- Updated dependencies [6eab31e]
- Updated dependencies [9314b36]
- Updated dependencies [083ed83]
- Updated dependencies [6511990]
- Updated dependencies [a526e63]
  - @assistant-ui/react@0.11.60

## 0.0.9

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-stream@0.2.47
  - @assistant-ui/react@0.11.58

## 0.0.8

### Patch Changes

- bb1b4c2: fix(react-ag-ui): add missing DictationAdapter to UseAgUiRuntimeAdapters
- Updated dependencies [ebd41c7]
- Updated dependencies [9a110ea]
- Updated dependencies [caee095]
- Updated dependencies [9883125]
  - @assistant-ui/react@0.11.57

## 0.0.7

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-stream@0.2.46
  - @assistant-ui/react@0.11.53

## 0.0.6

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
  - @assistant-ui/react@0.11.50
  - assistant-stream@0.2.45

## 0.0.5

### Patch Changes

- Updated dependencies [89aec17]
- Updated dependencies [ee7040f]
- Updated dependencies [bd27465]
- Updated dependencies [a3e9549]
- Updated dependencies [206616b]
- Updated dependencies [7aa77b5]
  - assistant-stream@0.2.44
  - @assistant-ui/react@0.11.49

## 0.0.4

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [ba26b22]
- Updated dependencies [d169e4f]
- Updated dependencies [da9f8a6]
- Updated dependencies [01c31fe]
  - @assistant-ui/react@0.11.48
  - assistant-stream@0.2.43

## 0.0.3

### Patch Changes

- ec662cd: chore: update dependencies
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - @assistant-ui/react@0.11.45

## 0.0.2

### Patch Changes

- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - @assistant-ui/react@0.11.40

## 0.0.1

### Patch Changes

- Updated dependencies [ef58020]
  - assistant-stream@0.2.40
