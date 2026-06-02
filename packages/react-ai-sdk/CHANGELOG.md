# @assistant-ui/react-ai-sdk

## 1.3.32

### Patch Changes

- [#4196](https://github.com/assistant-ui/assistant-ui/pull/4196) [`b3655bc`](https://github.com/assistant-ui/assistant-ui/commit/b3655bcebf233d2de986d4f1f51ac0261ea3ea7a) - fix: strip stale approval object when cancelling a tool pending approval so the next request passes validateUIMessages ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4192](https://github.com/assistant-ui/assistant-ui/pull/4192) [`4f2e077`](https://github.com/assistant-ui/assistant-ui/commit/4f2e077e10840faf8748d9aa13b782dd828ea776) - fix: support data message parts in toCreateMessage instead of throwing ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#4216](https://github.com/assistant-ui/assistant-ui/pull/4216) [`d440594`](https://github.com/assistant-ui/assistant-ui/commit/d44059483e366b4763328545754ff50b81fe110c) - fix: convert generative tool `toModelOutput` to AI SDK content shape ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#4212](https://github.com/assistant-ui/assistant-ui/pull/4212) [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84) - feat: add MCP server support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4213](https://github.com/assistant-ui/assistant-ui/pull/4213) [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab) - feat: add provider-executed tool support to generative toolkits ([@Yonom](https://github.com/Yonom))

- [#4199](https://github.com/assistant-ui/assistant-ui/pull/4199) [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47) - feat: a `defineToolkit` entry may now be an already-formed `ToolDefinition` (carrying its own `type`), not only an inline definition whose `type` the compiler infers. This is what lets a factory like `new JSONGenerativeUI({ library }).present()` be used directly as a tool. ([@Yonom](https://github.com/Yonom))

  Renames the authoring types to match `defineToolkit`: `ToolkitDeclaration` → `ToolkitDefinition`, and adds `ToolkitDefinitionEntry` (the union of an inline tool definition and a pre-formed `ToolDefinition`). The per-tool inline type is now an internal `ToolkitDefinitionInput` and is no longer exported.

- Updated dependencies [[`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47)]:
  - assistant-cloud@0.1.31
  - @assistant-ui/core@0.2.10

## 1.3.31

### Patch Changes

- [#4172](https://github.com/assistant-ui/assistant-ui/pull/4172) [`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92) - feat: add `generativeTools({ toolkit, frontendTools })` — builds an AI SDK `ToolSet` from an assistant-ui toolkit (server-side `execute`) merged with the frontend-uploaded tools, for use in `streamText`/`generateText`. Pairs with the `"use generative"` compiler so a backend tool's `execute` runs on the server while its `render` ships to the client. ([@Yonom](https://github.com/Yonom))

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- [#4169](https://github.com/assistant-ui/assistant-ui/pull/4169) [`8518a29`](https://github.com/assistant-ui/assistant-ui/commit/8518a292cf5045b03a17e3750800ecaad61ed8bd) - fix: don't abort the whole history load when a stored row fails to convert. `toExportedMessageRepository` now drops a row whose `content` can't be decoded to a valid message (e.g. a hand-seeded `{ "foo": "bar" }` with no `role`), along with any descendants that referenced it, and discards a `headId` that points at a dropped row. previously a single bad row emitted an `undefined` message (or left a dangling `parentId` / `headId`) that threw `Cannot read properties of undefined (reading 'id')` or `Parent message not found` during `thread.import`, taking down the entire thread. the rest of the thread now loads, matching how the cloud adapter filters out rows it can't decode rather than throwing. ([@okisdev](https://github.com/okisdev))

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

- [#4162](https://github.com/assistant-ui/assistant-ui/pull/4162) [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe) - fix: drop phantom sibling messages when an external store swaps an optimistic message id mid-run ([#4037](https://github.com/assistant-ui/assistant-ui/issues/4037)). ([@Yonom](https://github.com/Yonom))

  Messages can now be flagged `metadata.isOptimistic`. Optimistic messages are treated as ephemeral: they only ever live on the current head branch (the repository evicts off-branch optimistic messages whenever the head moves) and they are never written to persisted state (`export()` omits them). The AI SDK v6 adapter flags the streaming assistant message as optimistic, so when its client-generated id is replaced by a server-provided one mid-run, the stale placeholder no longer lingers as a phantom branch (e.g. `BranchPicker` showing `2/2` on a turn the user never branched). Unlike the reverted blanket id-diff ([#4040](https://github.com/assistant-ui/assistant-ui/issues/4040)), only explicitly-optimistic messages are affected, so legitimate `onEdit` / `onReload` / `switchToBranch` branches are preserved.

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

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e)]:
  - @assistant-ui/core@0.2.8
  - @assistant-ui/store@0.2.13
  - assistant-cloud@0.1.30

## 1.3.30

### Patch Changes

- [#4125](https://github.com/assistant-ui/assistant-ui/pull/4125) [`e639a11`](https://github.com/assistant-ui/assistant-ui/commit/e639a11838642aa111644077ba51acf6277051f2) - chore: drop tracker-behaviour explainer comments left behind in satellite runtimes ([@Yonom](https://github.com/Yonom))

## 1.3.29

### Patch Changes

- [#4123](https://github.com/assistant-ui/assistant-ui/pull/4123) [`4b95d4c`](https://github.com/assistant-ui/assistant-ui/commit/4b95d4c9510febbd5175f30884a87afa69f5adf8) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33), [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33)]:
  - @assistant-ui/core@0.2.7

## 1.3.28

### Patch Changes

- [#4107](https://github.com/assistant-ui/assistant-ui/pull/4107) [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4) - feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a), [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4)]:
  - @assistant-ui/core@0.2.6

## 1.3.27

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - @assistant-ui/core@0.2.5
  - assistant-cloud@0.1.29
  - @assistant-ui/store@0.2.12

## 1.3.26

### Patch Changes

- [#4030](https://github.com/assistant-ui/assistant-ui/pull/4030) [`798a5ce`](https://github.com/assistant-ui/assistant-ui/commit/798a5ceec9dc6ea4688a66d42b6293a50ef5295a) - fix(react-ai-sdk): resolve MCP app metadata from tool output `_meta["ui/resourceUri"]` as a fallback when it isn't present in `callProviderMetadata.mcp.app`. MCP-UI tools (e.g. xmcp) surface the UI pointer in the call result, so the renderer previously never picked it up. ([@Yonom](https://github.com/Yonom))

## 1.3.25

### Patch Changes

- [#4024](https://github.com/assistant-ui/assistant-ui/pull/4024) [`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398) - feat: add native MCP Apps renderer — `McpAppRenderer` composes into `Tools` to render MCP UI resources inline in chat over a JSON-RPC postMessage bridge on `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter. ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398)]:
  - @assistant-ui/core@0.2.2

## 1.3.24

### Patch Changes

- [#4003](https://github.com/assistant-ui/assistant-ui/pull/4003) [`717bed2`](https://github.com/assistant-ui/assistant-ui/commit/717bed2810b0841cac43bc998ba8aef69f5c4979) - feat: expose `suggestions` on `useAISDKRuntime` and `useChatRuntime` ([@okisdev](https://github.com/okisdev))

  both hooks now accept an optional `suggestions: readonly ThreadSuggestion[]` option that is forwarded to the underlying `useExternalStoreRuntime`. this lets AI SDK callers drive follow up suggestions from application state, tool results, or backend responses without dropping down to the raw external store runtime.

- [#4001](https://github.com/assistant-ui/assistant-ui/pull/4001) [`283c250`](https://github.com/assistant-ui/assistant-ui/commit/283c250d2aba5633022b59634dbd18a870b28fe0) - feat(react-ai-sdk): expose `onResume` on `useAISDKRuntime` and `useChatRuntime` ([@okisdev](https://github.com/okisdev))

  `AISDKRuntimeAdapter` and `UseChatRuntimeOptions` now accept `onResume`, which is forwarded to the underlying `useExternalStoreRuntime` adapter. `runtime.thread.resumeRun(config)` previously threw `"Runtime does not support resuming runs."` because the inner adapter literal omitted the field; consumers had to monkey-patch `runtime.thread.__internal_threadBinding.getState().resumeRun` to bridge their own replay channels (e.g. SSE reconnect endpoints keyed by turn id). This is a thin pass-through; the existing transport-level resume on `AssistantChatTransport` (auto-fired by `useChatRuntime` on mount) is unchanged and complementary.

- [#3979](https://github.com/assistant-ui/assistant-ui/pull/3979) [`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9) - feat(react-ai-sdk): native resumable stream client integration ([@okisdev](https://github.com/okisdev))

  `AssistantChatTransport` accepts a `resumable: { storage, resumeApi, isFinishEvent? }` option that captures the stream id from the response header, watches the SSE body for the AI SDK `finish` marker so the stored id is cleared on natural completion (cancellation leaves it intact for the next mount), and redirects `chat.resumeStream()` reconnects to `resumeApi`. `createResumableSessionStorage` is the default `sessionStorage`-backed `ResumableClientStorage`. `useChatRuntime` auto-fires `chat.resumeStream()` once on mount when storage already has an id, so adopters drop the manual `useEffect`.

- [#4008](https://github.com/assistant-ui/assistant-ui/pull/4008) [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07) - feat: support multi-modal tool results via `toModelOutput` ([@okisdev](https://github.com/okisdev))

  frontend tools can now project their execution output into multi-modal model content (text + image / pdf / arbitrary file parts), aligning with the AI SDK v6 `toModelOutput` callback. previously, tool results were always serialized as a single JSON value, so a "read pdf" style tool had no way to send the PDF back to a multi-modal model.
  - `assistant-stream` exports a new `ToolModelContentPart` type (`{ type: "text", text } | { type: "file", data, mediaType, filename? }`) and a `ToolModelOutputFunction<TArgs, TResult>` callback type. `Tool.toModelOutput` is wired through `unstable_runPendingTools` and `ToolExecutionStream`, attaching the resulting `modelContent` to the `tool-call` part on the assistant message.
  - `@assistant-ui/core` re-exports `ToolModelContentPart` and adds an optional `modelContent?: readonly ToolModelContentPart[]` field on `ToolCallMessagePart`. existing tools and renderers are unchanged.
  - `@assistant-ui/react-ai-sdk`'s `frontendTools(...)` helper now also registers a `toModelOutput` on each forwarded tool. it transparently unwraps an envelope that `useAISDKRuntime` writes when a frontend-executed tool produced `modelContent`, turning it into AI SDK's `{ type: "content", value: [...] }` output. plain (non-envelope) outputs fall back to the existing `{ type: "text" | "json", value }` shape, so behavior for tools without `toModelOutput` is unchanged.

  route handlers that adopt `toModelOutput` also need to pass `tools` to `convertToModelMessages` (this is the [AI SDK's documented pattern](https://ai-sdk.dev/docs/reference/ai-sdk-ui/convert-to-model-messages#multi-modal-tool-responses)):

  ```ts
  const aiSDKTools = { ...frontendTools(tools ?? {}) };
  streamText({
    messages: await convertToModelMessages(messages, { tools: aiSDKTools }),
    tools: aiSDKTools,
  });
  ```

  templates and existing examples are unchanged. they keep the simpler `convertToModelMessages(messages)` form because none of the tools they ship with use `toModelOutput`. the new tools guide page documents how to opt in.

  **reserved key.** when a frontend tool defines `toModelOutput`, its result is persisted in the AI SDK chat as `{ __aui_modelContent: ToolModelContentPart[], value: <your result> }`. tools must not return objects whose top-level key is literally `__aui_modelContent`, or `convertMessage` will misread the result. the prefix is namespaced for this reason.

  **read/write compatibility for persisted threads.** the envelope is recognized by `@assistant-ui/react-ai-sdk` from this version onward. if you persist UI messages and read them from multiple environments, upgrade every reader before any writer starts producing `toModelOutput`; otherwise older readers will treat the envelope object as the `result` and break the affected tool `render` functions.

- [#4004](https://github.com/assistant-ui/assistant-ui/pull/4004) [`d3cf8cd`](https://github.com/assistant-ui/assistant-ui/commit/d3cf8cda6246a09cc4284dc2a333094faef120f6) - fix(react-ai-sdk): preserve tool args when AI SDK briefly emits null input ([@okisdev](https://github.com/okisdev))

  the AI SDK occasionally emits snapshots of an in-flight tool call where
  `input` is null/undefined, which previously collapsed `argsText` to `"{}"`
  mid-stream and tripped the runtime's append-only invariant (warning + tool
  args stream restart, losing accumulated state). `convertMessage` now caches
  the last good input per `(message.id, toolCallId)` via a new
  `toolLastInputCache` on `AISDKMessageConverterMetadata` and falls back to it
  when a later snapshot drops `input`.

- [#3634](https://github.com/assistant-ui/assistant-ui/pull/3634) [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930) - Support AI SDK `source-document` parts by preserving them as assistant-ui ([@sicko7947](https://github.com/sicko7947))
  document source message parts across conversion and cloud serialization,
  including the legacy React cloud encoder.
- Updated dependencies [[`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07), [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1), [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3), [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930)]:
  - @assistant-ui/core@0.2.1

## 1.3.23

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 1.3.22

### Patch Changes

- [#3942](https://github.com/assistant-ui/assistant-ui/pull/3942) [`fbd7ce3`](https://github.com/assistant-ui/assistant-ui/commit/fbd7ce38d5a8d3992ad44acf7c6f29e115a43681) - fix: `aui.thread().append({ startRun: false })` no longer triggers a run on AI SDK runtime ([@Yonom](https://github.com/Yonom))

  `useAISDKRuntime`'s `onNew` and `onEdit` always called `chatHelpers.sendMessage`, ignoring `message.startRun`. The hook now appends the message via `chatHelpers.setMessages` (with a generated id when needed) and returns early when `startRun: false`, so the message lands in the chat without kicking off a model call.

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/core@0.1.18
  - @assistant-ui/store@0.2.10

## 1.3.21

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/store@0.2.9

## 1.3.20

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3841](https://github.com/assistant-ui/assistant-ui/pull/3841) [`435cfa0`](https://github.com/assistant-ui/assistant-ui/commit/435cfa0318d10478e56a1d1f82bee7dd4e359364) - fix: request body `id` in `useChatRuntime` is now the real thread id instead of the literal `"DEFAULT_THREAD_ID"`. `AssistantChatTransport` was resolving `remoteId` from the inner `ExternalStoreThreadListRuntimeCore` (which only echoes its default id); it now uses the outer `RemoteThreadListRuntimeCore` that actually calls the adapter. ([@okisdev](https://github.com/okisdev))

- [#3858](https://github.com/assistant-ui/assistant-ui/pull/3858) [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1) - fix: `useAISDKRuntime` now throws when the supplied `ThreadHistoryAdapter` omits `withFormat`, instead of silently dropping all history load/append/update calls. The optional-call chain `historyAdapter.withFormat?.(…).load()` previously short-circuited to `undefined`. The `withFormat`-wrapped adapter is now memoized, and the persist effect short-circuits when no adapter is supplied (avoiding a redundant thread subscription). `ThreadHistoryAdapter.withFormat` gains a JSDoc note clarifying that it is required on the AI SDK path. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8

## 1.3.19

### Patch Changes

- c988db8: chore: update dependencies
- a5bce86: fix: preserve latest thread token usage during pending turns
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7

## 1.3.18

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - assistant-cloud@0.1.25

## 1.3.17

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [6554892]
- Updated dependencies [9103282]
- Updated dependencies [876f75d]
- Updated dependencies [bdce66f]
- Updated dependencies [4abb898]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
- Updated dependencies [af70d7f]
  - @assistant-ui/core@0.1.10
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6

## 1.3.16

### Patch Changes

- 781f28d: feat: accept all file types and validate against adapter's accept constraint
- 0924711: fix(react-ai-sdk): convert assistant file parts to FileMessagePart instead of dropping them
- 52403c3: chore: update dependencies
- Updated dependencies [781f28d]
- Updated dependencies [3227e71]
- Updated dependencies [0f55ce8]
- Updated dependencies [83a15f7]
- Updated dependencies [52403c3]
- Updated dependencies [ffa3a0f]
  - @assistant-ui/core@0.1.9
  - assistant-cloud@0.1.23
  - @assistant-ui/store@0.2.5

## 1.3.15

### Patch Changes

- 01a59da: fix(react-ai-sdk): preserve runConfig.custom metadata after tool call resume in human-in-the-loop tools
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

## 1.3.14

### Patch Changes

- 349f3c7: chore: update deps
- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-cloud@0.1.22
  - @assistant-ui/store@0.2.3

## 1.3.13

### Patch Changes

- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
- Updated dependencies [01bee2b]
  - @assistant-ui/core@0.1.3

## 1.3.12

### Patch Changes

- 57e26d2: chore: update dependencies

## 1.3.11

### Patch Changes

- a845911: chore: update dependencies
- Updated dependencies [07dcce0]
- Updated dependencies [a845911]
- Updated dependencies [bc40eaf]
- Updated dependencies [be23d74]
- Updated dependencies [1eb059c]
  - @assistant-ui/react@0.12.15
  - assistant-cloud@0.1.21

## 1.3.10

### Patch Changes

- 51de636: feat(react-ai-sdk): add thread token-usage extraction helpers and hook
- 7ad20d1: fix(react-ai-sdk): stabilize tool args key order to prevent duplicate toolCallId crash in tapResources
- Updated dependencies [17cf9a8]
  - assistant-cloud@0.1.20
  - @assistant-ui/react@0.12.13

## 1.3.9

### Patch Changes

- 36ef3a2: chore: update dependencies
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
  - assistant-cloud@0.1.19
  - @assistant-ui/react@0.12.12

## 1.3.8

### Patch Changes

- aeec3b9: fix: handle AI SDK v6 approval tool states (approval-requested, approval-responded, output-denied)
- 7836760: fix(assistant-cloud): expand joined messages for AI SDK v6 history export and telemetry reporting
- 61b54e9: Add message timing metadata: `AssistantMessageTiming` type, automatic timing tracking in `AssistantMessageAccumulator`, `MessageTiming` type, `useMessageTiming()` hook, and client-side streaming timing for AI SDK runtime.
- a247fc9: feat(assistant-cloud): allow save complete multi-step message
- 93910bd: Rename .tsx files to .ts where no JSX syntax is used
- Updated dependencies [d08a488]
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
  - assistant-cloud@0.1.18
  - @assistant-ui/react@0.12.11

## 1.3.7

### Patch Changes

- afaaf3b: fix: duplicate key toolCallId error in HITL tools (#3197)
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [afaaf3b]
- Updated dependencies [51d24be]
- Updated dependencies [afaaf3b]
  - @assistant-ui/react@0.12.10

## 1.3.6

### Patch Changes

- a088518: chore: update dependencies
- Updated dependencies [a088518]
- Updated dependencies [d8122cc]
  - assistant-cloud@0.1.17
  - @assistant-ui/react@0.12.9

## 1.3.5

### Patch Changes

- 39fefec: feat: importExternalState API
- Updated dependencies [39fefec]
  - @assistant-ui/react@0.12.6

## 1.3.4

### Patch Changes

- d45b893: chore: update dependencies
- Updated dependencies [d45b893]
- Updated dependencies [fe71bfc]
  - assistant-cloud@0.1.16
  - @assistant-ui/react@0.12.5

## 1.3.3

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
  - assistant-cloud@0.1.15

## 1.3.2

### Patch Changes

- 605d825: chore: update dependencies
- Updated dependencies [1ea3e28]
- Updated dependencies [8cbf686]
- Updated dependencies [a8be364]
- Updated dependencies [605d825]
  - @assistant-ui/react@0.12.2
  - assistant-cloud@0.1.14

## 1.3.1

### Patch Changes

- 5876c0f: feat(react-ai-sdk): propagate ModelContext config (modelName) through AssistantChatTransport
- Updated dependencies [8672695]
  - @assistant-ui/react@0.12.1

## 1.2.1

### Patch Changes

- 083ed83: fix(cloud): serialize image and file parts across all formats
- Updated dependencies [6eab31e]
- Updated dependencies [9314b36]
- Updated dependencies [083ed83]
- Updated dependencies [6511990]
- Updated dependencies [a526e63]
  - @assistant-ui/react@0.11.60

## 1.2.0

### Minor Changes

- 6fd744a: Upgrade to Vercel AI SDK v6
  - Updated peer dependencies: `ai@^6.0.0`, `@ai-sdk/react@^3.0.0`
  - Renamed format adapter from `aiSDKV5FormatAdapter` to `aiSDKV6FormatAdapter`
  - Updated `@ai-sdk/provider` to use LanguageModelV2 types

### Patch Changes

- 3719567: chore: update deps
- Updated dependencies [3719567]
  - assistant-cloud@0.1.13
  - @assistant-ui/react@0.11.58

## 1.1.21

### Patch Changes

- 5ce45bd: fix(react-ai-sdk): preserve metadata in message conversion
- Updated dependencies [3a0b9c8]
- Updated dependencies [b8f62e1]
- Updated dependencies [8d5c20c]
  - @assistant-ui/react@0.11.56

## 1.1.20

### Patch Changes

- 57bd207: chore: update dependencies
- cce009d: chore: use tsc for building packages
- Updated dependencies [57bd207]
- Updated dependencies [cce009d]
  - assistant-cloud@0.1.12
  - @assistant-ui/react@0.11.53

## 1.1.19

### Patch Changes

- e8ea57b: chore: update deps
- Updated dependencies [bae3aa2]
- Updated dependencies [e8ea57b]
  - @assistant-ui/react@0.11.50
  - assistant-stream@0.2.45
  - assistant-cloud@0.1.11

## 1.1.18

### Patch Changes

- 89aec17: feat: AI SDK frontend tool execution cancellation support
  fix: AI SDK isRunning status when running frontend tools
- Updated dependencies [89aec17]
- Updated dependencies [ee7040f]
- Updated dependencies [bd27465]
- Updated dependencies [a3e9549]
- Updated dependencies [206616b]
- Updated dependencies [7aa77b5]
  - assistant-stream@0.2.44
  - @assistant-ui/react@0.11.49

## 1.1.17

### Patch Changes

- 01c31fe: chore: update dependencies
- Updated dependencies [ba26b22]
- Updated dependencies [d169e4f]
- Updated dependencies [da9f8a6]
- Updated dependencies [01c31fe]
  - @assistant-ui/react@0.11.48
  - assistant-stream@0.2.43
  - assistant-cloud@0.1.10

## 1.1.16

### Patch Changes

- c4142ac: fix(react-ai-sdk): pass runConfig metadata to backend API request

## 1.1.15

### Patch Changes

- ab8953b: feat(react): add `allowNesting` option to allow wrapping runtimes with custom thread list adapters
- Updated dependencies [ab8953b]
  - @assistant-ui/react@0.11.46

## 1.1.14

### Patch Changes

- ec662cd: chore: update dependencies
- cdb5ea5: mark tool call as complete once user sends new message when tool calling
- 5dd925e: feat(ai-sdk): allow updates to headers/body
- Updated dependencies [ec662cd]
  - assistant-stream@0.2.42
  - assistant-cloud@0.1.9
  - @assistant-ui/react@0.11.45

## 1.1.13

### Patch Changes

- 4f6afef: feat: unified json schema
- Updated dependencies [4f6afef]
  - @assistant-ui/react@0.11.44

## 1.1.12

### Patch Changes

- faed815: feat: AI SDK error toolOutput support
- 2c33091: chore: update deps
- Updated dependencies [2c33091]
  - assistant-stream@0.2.41
  - assistant-cloud@0.1.8
  - @assistant-ui/react@0.11.40

## 1.1.11

### Patch Changes

- 0bcbb58: feat: custom `toCreateMessage` callback
  fix: use AI SDK's idGenerator function for new messages
- b408005: feat(react-ai-sdk): Integrate AI SDK v5 data parts in message content
- Updated dependencies [b408005]
- Updated dependencies [7a6d9ca]
- Updated dependencies [70d5966]
- Updated dependencies [3754bdd]
- Updated dependencies [0a4bdc1]
  - @assistant-ui/react@0.11.39

## 1.1.10

### Patch Changes

- 34d1c78: fix(react-ai-sdk): correctly initialize history loading state
- Updated dependencies [66a13a0]
- Updated dependencies [4e3877e]
- Updated dependencies [eef682b]
  - @assistant-ui/react@0.11.38
  - assistant-cloud@0.1.7

## 1.1.9

### Patch Changes

- 81b581f: feat: display AI SDK errors
- 6d2c134: feat: useChatRuntime should use the assistant ui thread id remote id as the threadid by default
- 2fc7e99: chore: update deps
- Updated dependencies [3ab9484]
- Updated dependencies [7a88ead]
- Updated dependencies [81b581f]
- Updated dependencies [2fc7e99]
  - @assistant-ui/react@0.11.36
  - assistant-stream@0.2.39
  - assistant-cloud@0.1.6

## 1.1.8

### Patch Changes

- 953db24: chore: update deps
- Updated dependencies [953db24]
- Updated dependencies
  - assistant-stream@0.2.37
  - assistant-cloud@0.1.5
  - @assistant-ui/react@0.11.34

## 1.1.7

### Patch Changes

- chore: update deps
- Updated dependencies
  - assistant-stream@0.2.36
  - assistant-cloud@0.1.4
  - @assistant-ui/react@0.11.31

## 1.1.6

### Patch Changes

- a5f9dd5: Export missing types for custom runtime integration
- Updated dependencies [92dfb0f]
  - @assistant-ui/react@0.11.29

## 1.1.5

### Patch Changes

- e6a46e4: chore: update deps
- Updated dependencies [e6a46e4]
  - assistant-stream@0.2.34
  - assistant-cloud@0.1.3
  - @assistant-ui/react@0.11.27

## 1.1.4

### Patch Changes

- e81784b: feat: Tool Call interrupt() resume() API
- Updated dependencies [e8d6d7b]
- Updated dependencies [e81784b]
  - @assistant-ui/react@0.11.22
  - assistant-stream@0.2.32

## 1.1.3

### Patch Changes

- e46e4d3: fix: guard threadItem access for useAISDKRuntime
- Updated dependencies [c0f5003]
  - assistant-stream@0.2.31

## 1.1.2

### Patch Changes

- 8812f86: chore: update deps
- Updated dependencies [8812f86]
  - assistant-stream@0.2.30
  - assistant-cloud@0.1.2

## 1.1.1

### Patch Changes

- 68ef242: feat(ui): load external history only when thread has remote id
- Updated dependencies [2c6198a]
  - @assistant-ui/react@0.11.19

## 1.1.0

### Patch Changes

- 39ac2f3: feat: AI SDK v5 import support
- Updated dependencies [39ac2f3]
- Updated dependencies [5437dbe]
  - @assistant-ui/react@0.11.0

## 1.0.7

### Patch Changes

- d7d9058: fix: cloud chat history not loading in some configurations

## 1.0.6

### Patch Changes

- 860bf42: feat: useAISDKRuntime cloud history support (without useChatRuntime)
- Updated dependencies [3498c99]
  - @assistant-ui/react@0.10.50

## 1.0.5

### Patch Changes

- 90fc83b: fixes attachment naming
- e64b20c: fix: persistence only saving the first two messages

## 1.0.4

### Patch Changes

- 9235fe1: update dep array in external history adapter

## 1.0.3

### Patch Changes

- ceedf45: feat: pass run-config to ai-sdk metadata to let user decide what to do after
- 5504836: pass callsettings in extra body object to AI chat transport
- Updated dependencies [a80dcff]
  - @assistant-ui/react@0.10.43

## 1.0.2

### Patch Changes

- 672db5a: feat: frontend function calling support
- 12e0a77: chore: update deps
- Updated dependencies [12e0a77]
  - assistant-stream@0.2.23
  - assistant-cloud@0.1.1
  - @assistant-ui/react@0.10.42

## 1.0.1

### Patch Changes

- eda5558: feat: AI SDK custom UIMessage type support
- Updated dependencies [eda5558]
  - @assistant-ui/react@0.10.41

## 1.0.0

### Patch Changes

- de215fd: fix: history loading
- Updated dependencies [179f8b7]
  - assistant-cloud@0.1.0
  - @assistant-ui/react@0.10.40

## 0.11.5

### Patch Changes

- a4389da: feat: AI SDK v5 assistant-cloud thread history support
- Updated dependencies [a4389da]
  - @assistant-ui/react@0.10.39

## 0.11.4

### Patch Changes

- 979ee67: feat: forward system and tools to the backend for useChatRuntime
- 979ee67: feat: assistant cloud support for AI SDK v5
- 979ee67: feat: add AssistantChatTransport
- Updated dependencies [979ee67]
  - @assistant-ui/react@0.10.38

## 0.11.3

### Patch Changes

- 2ef6cae: feat: Add useChatRuntime as new recommended entry point for AI-SDK V5
- Updated dependencies [f32b6a4]
  - @assistant-ui/react@0.10.37

## 0.11.1

### Patch Changes

- 20ffa06: fix: Don't omit attachments from `AISDKRuntimeAdapter` type
- Updated dependencies [ed78407]
- Updated dependencies [77ce337]
- Updated dependencies [f59959e]
  - @assistant-ui/react@0.10.36

## 0.11.0

### Patch Changes

- 0f063e0: chore: update dependencies
- Updated dependencies [0f063e0]
- Updated dependencies [5d8b074]
  - assistant-stream@0.2.22
  - @assistant-ui/react@0.10.34
