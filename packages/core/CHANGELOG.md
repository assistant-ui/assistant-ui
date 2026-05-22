# @assistant-ui/core

## 0.2.4

### Patch Changes

- [#4077](https://github.com/assistant-ui/assistant-ui/pull/4077) [`221d320`](https://github.com/assistant-ui/assistant-ui/commit/221d320cee987a4cd464c9cbae152d918197499e) - fix(core|MessageParts,GroupedParts): key part fibers by absolute part index ([@Yonom](https://github.com/Yonom))

  Inside `MessagePrimitive.GroupedParts` and the auto-grouped
  `toolGroup` / `reasoningGroup` ranges of `MessagePrimitive.Parts`,
  leaf fibers were keyed by their **structural position** in the
  group tree rather than by the underlying part's absolute index.
  When the parts list reshaped (e.g., a thread switch with a
  different group layout), React reused the same fiber at a given
  structural slot but with a different `index` prop, keeping the
  prior tap subscription alive against an index that may now point
  at a different part or be out of range — surfacing as
  `tapClientLookup: Index N out of bounds` or
  `MessagePartText can only be used inside text or reasoning message
parts`. Keying by part index instead causes React to unmount the
  fiber when the part underneath actually changes.

## 0.2.3

### Patch Changes

- [#4023](https://github.com/assistant-ui/assistant-ui/pull/4023) [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33) - docs: add JSDoc for core runtime and assistant tool APIs ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3513](https://github.com/assistant-ui/assistant-ui/pull/3513) [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47) - fix: guard `navigator.clipboard` availability and swallow write rejections in `ActionBarPrimitive.Copy`. Previously, copy clicks in SSR, non-HTTPS contexts, or older browsers without the Clipboard API threw a `ReferenceError`, and permission-denied rejections surfaced as unhandled promise rejections. The web copyToClipboard implementation in `@assistant-ui/react` now early-rejects when the API is unavailable, and `useActionBarCopy` in `@assistant-ui/core` silently absorbs the rejection so the rest of the UI is unaffected. ([@JustAnOkapi](https://github.com/JustAnOkapi))

- [#4057](https://github.com/assistant-ui/assistant-ui/pull/4057) [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd) - fix(core): fire `streamCall` for already-resolved tool calls observed after the initial snapshot, and promote in-progress tool calls from the initial snapshot once they change. Previously the runtime silently skipped `streamCall` whenever a tool-call part arrived already-resolved (history reload, thread switch, mid-run resume, PTC sub-call surfacing), forcing fragile render-effect fallbacks. `execute` stays suppressed for these cases so side effects don't double-run. ([@Yonom](https://github.com/Yonom))

  Also collapses the per-tool-call ref soup inside `useToolInvocations` into a single discriminated `ToolCallEntry` map keyed by logical tool-call id, with execution-lifecycle bookkeeping tracked separately by physical stream id. Removes `ignoredToolIds`, `lastToolStates`, `toolCallIdAliasesRef` identity entries, the parallel `restoredSignaturesRef`/`preResolvedToolCallIdsRef`/`startedExecutionToolCallIdsRef` sets, and the early-return that suppressed `streamCall` for already-resolved tool calls. `reset()` semantics are unchanged; integrators that already call `reset()` on history reload don't need to change.

- [#3958](https://github.com/assistant-ui/assistant-ui/pull/3958) [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917) - refactor: hoist `MessagePartPrimitiveInProgress` to `@assistant-ui/core/react` so `@assistant-ui/react`, `@assistant-ui/react-ink`, and other distributions can share the same implementation. `@assistant-ui/react`'s `MessagePartPrimitive.InProgress` is unchanged for callers; it now re-exports from core. ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3636](https://github.com/assistant-ui/assistant-ui/pull/3636) [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd) - feat(core): expose modelName and toolNames in ModelContextState ([@ShobhitPatra](https://github.com/ShobhitPatra))

- Updated dependencies [[`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710), [`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33)]:
  - assistant-cloud@0.1.28
  - @assistant-ui/store@0.2.11
  - assistant-stream@0.3.15
  - @assistant-ui/tap@0.5.11

## 0.2.2

### Patch Changes

- [#4024](https://github.com/assistant-ui/assistant-ui/pull/4024) [`19d4d94`](https://github.com/assistant-ui/assistant-ui/commit/19d4d9412234628ae850b4b04da594201022a398) - feat: add native MCP Apps renderer — `McpAppRenderer` composes into `Tools` to render MCP UI resources inline in chat over a JSON-RPC postMessage bridge on `SafeContentFrame`. Adds an `mcp` field to `ToolCallMessagePart` and forwards `callProviderMetadata.mcp.app` through the AI SDK message converter. ([@Yonom](https://github.com/Yonom))

## 0.2.1

### Patch Changes

- [#3984](https://github.com/assistant-ui/assistant-ui/pull/3984) [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198) - feat(composer): expose `canSend` state and `isSendDisabled` adapter input ([@okisdev](https://github.com/okisdev))

  `ComposerState.canSend` (read-only) is now derivable via `useAuiState((s) => s.composer.canSend)` and `<AuiIf condition={(s) => s.composer.canSend}/>`. it reflects whether the composer is in a state where send is permitted; cross-thread gating (`isRunning`, `capabilities.queue`) continues to be layered on top by `useComposerSend`.

  `ExternalStoreAdapter.isSendDisabled` is a new optional input alongside `isDisabled`. when `true`, the thread composer's input remains usable but `send()` becomes a no-op and `canSend` is `false`. use this to gate sending on external React state (e.g. while tool config is loading) without disabling the input itself. edit composers (saving in-progress message edits) intentionally ignore this flag, since it is a thread-scoped gate.

  `BaseComposerRuntimeCore.send()` now early-returns when `!canSend`, so the `Cmd/Ctrl+Shift+Enter` steer hotkey, form-`requestSubmit()`, and direct `aui.composer().send()` calls are all gated by the same flag. the same gating is wired through the tap-based `ExternalThread` client via a new `isSendDisabled` prop on `ExternalThreadProps`.

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

- [#3972](https://github.com/assistant-ui/assistant-ui/pull/3972) [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1) - fix: `useExternalStoreRuntime` no longer crashes with "Entry not available in the store" when the adapter sets `threadId` to a value that isn't present in `threads`/`archivedThreads`. The runtime now synthesizes a regular thread item for `mainThreadId`, so thin adapters (e.g. `useAgUiRuntime`) that only expose `threadId` resolve correctly on first render and after switching threads. Closes [#3971](https://github.com/assistant-ui/assistant-ui/issues/3971). ([@okisdev](https://github.com/okisdev))

- [#3674](https://github.com/assistant-ui/assistant-ui/pull/3674) [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3) - fix(core): guard MessagePrimitive.Attachments against missing user message attachments ([@cewinharhar](https://github.com/cewinharhar))

- [#3634](https://github.com/assistant-ui/assistant-ui/pull/3634) [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930) - Support AI SDK `source-document` parts by preserving them as assistant-ui ([@sicko7947](https://github.com/sicko7947))
  document source message parts across conversion and cloud serialization,
  including the legacy React cloud encoder.
- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07)]:
  - assistant-stream@0.3.14

## 0.2.0

### Minor Changes

- [#3970](https://github.com/assistant-ui/assistant-ui/pull/3970) [`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088) - chore: drop APIs deprecated in v0.11/v0.12 ([@Yonom](https://github.com/Yonom))

  See the [v0.14 migration guide](https://assistant-ui.com/docs/migrations/v0-14) for the full removal list and replacements.
  - `useAssistantApi` / `useAssistantState` / `useAssistantEvent` / `AssistantIf` removed (use `useAui` / `useAuiState` / `useAuiEvent` / `AuiIf`).
  - `getExternalStoreMessage` (singular) removed (use `getExternalStoreMessages`).
  - `MessageState.submittedFeedback` removed (use `message.metadata.submittedFeedback`).
  - `ThreadRuntime.startRun(parentId)` positional overload removed (pass `{ parentId }`).
  - `ThreadRuntime.unstable_loadExternalState` removed (use `importExternalState`).
  - `ThreadRuntime.unstable_resumeRun` removed (use `resumeRun`).
  - `ThreadRuntime.getModelConfig` removed (use `getModelContext`).
  - `AssistantRuntime.threadList` / `switchToNewThread` / `switchToThread` / `registerModelConfigProvider` / `reset` removed (use `threads` / `threads.switchToNewThread` / `threads.switchToThread` / `registerModelContextProvider` / `thread.reset`).
  - `ChatModelRunOptions.config` removed (use `context`).
  - `useLocalThreadRuntime` alias removed (use `useLocalRuntime`).
  - `unstable_useRemoteThreadListRuntime` / `unstable_useCloudThreadListAdapter` / `unstable_RemoteThreadListAdapter` / `unstable_InMemoryThreadListAdapter` aliases removed (drop the `unstable_` prefix).
  - `react-langgraph` `onSwitchToThread` removed (use `load`).
  - `toAISDKTools` / `getEnabledTools` removed (use `toToolsJSONSchema` from `assistant-stream`).

## 0.1.18

### Patch Changes

- [#3953](https://github.com/assistant-ui/assistant-ui/pull/3953) [`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6) - Add cursor-based pagination to the thread list. `RemoteThreadListAdapter.list()` accepts an optional `{ after }` cursor and may return `nextCursor` on the response. The runtime exposes `loadMore()`, `hasMore`, and `isLoadingMore` through both the legacy `ThreadListRuntime` API and the tap-only `aui.threads()` path; `ThreadListRuntimeCore.loadMore?()`, `hasMore?`, and `isLoadingMore?` are optional, so non-paginating cores (local, external-store, single-thread, in-memory) remain conformant. ([@okisdev](https://github.com/okisdev))

  `@assistant-ui/react` ships a matching `ThreadListPrimitive.LoadMore` button built on `createActionButton`, plus a `useThreadListLoadMore` primitive hook. Consumers wanting an `IntersectionObserver` sentinel can read `s.threads.hasMore` / `isLoadingMore` from `useAuiState` and call `aui.threads().loadMore()` directly.

  In-flight `loadMore()` calls dedup via a single promise. The existing `_loadGeneration` counter drops stale append callbacks when a `reload()` interleaves a `loadMore()`. The loadMore reducer captures the active adapter so a mid-flight adapter swap cannot leak a stale page. Empty-string `nextCursor` is normalised to `undefined`. `reload()` pre-clears the cursor so consumers reading `hasMore` directly during a reload do not observe a stale value.

  Adapter rejections are surfaced via `console.error` in both the initial-load and `loadMore` paths, matching the pattern in `RemoteThreadListHookInstanceManager` and `useToolInvocations`.

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11
  - assistant-cloud@0.1.27

## 0.1.17

### Patch Changes

- [#3916](https://github.com/assistant-ui/assistant-ui/pull/3916) [`0bbf5dd`](https://github.com/assistant-ui/assistant-ui/commit/0bbf5dd7357c0993958a2e8e55eb60705eca3207) - chore: drop `./*` wildcard export and surface internal attachment status types ([@Yonom](https://github.com/Yonom))

  The `./*` wildcard in `exports` was exposing the entire dist tree as importable subpaths, which inadvertently leaked internal modules (e.g. `@assistant-ui/core/tests/*`, `@assistant-ui/core/types/*`) as public API. Removing it.

  Two attachment status types that were previously only reachable through the wildcard (`PendingAttachmentStatus`, `CompleteAttachmentStatus`) are now re-exported from the package root so that consumers' inferred types remain portable.

- [#3917](https://github.com/assistant-ui/assistant-ui/pull/3917) [`98f165c`](https://github.com/assistant-ui/assistant-ui/commit/98f165ca83c4df9b9133eb4ce4fdf8c7a06886bb) - feat: enrich `composer.attachmentAddError` event with typed payload ([@okisdev](https://github.com/okisdev))

  The event now carries `{ reason, message, attachmentId?, error? }` so subscribers can branch on the failure mode (`no-adapter` / `not-accepted` / `adapter-error`). The bridge no longer relies on a `findLast` heuristic to recover the failed attachment id.

  Several state-derivable events are now annotated `@deprecated` because they duplicate state observation: `composer.send`, `composer.attachmentAdd`, `thread.runStart`, `thread.runEnd`, `thread.initialize`, `threadListItem.switchedTo`, `threadListItem.switchedAway`. They continue to fire for backward compatibility; new code should observe state via `useAuiState` instead.

- [#3914](https://github.com/assistant-ui/assistant-ui/pull/3914) [`62ec5bd`](https://github.com/assistant-ui/assistant-ui/commit/62ec5bd3368fb69ea7bcde275858e0ea8fa1d59b) - fix: add typesVersions to support moduleResolution: node ([@shashank-100](https://github.com/shashank-100))

  Users with `moduleResolution: node` in their tsconfig were seeing `Property 'message' does not exist on type 'AssistantState'` because the `exports` map sub-paths (e.g. `@assistant-ui/core/react`) are ignored by legacy node module resolution. Adding `typesVersions` makes TypeScript resolve sub-path types correctly under all moduleResolution modes.

- [#3853](https://github.com/assistant-ui/assistant-ui/pull/3853) [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4) - feat: add `<MessagePrimitive.GroupedParts>` for hierarchical adjacent grouping of message parts ([@Yonom](https://github.com/Yonom))

  Introduces a new primitive that coalesces adjacent parts into groups via a user-supplied `groupBy(part) → "group-…" | readonly "group-…"[] | null`. Adjacent parts sharing a key-path prefix coalesce up to that prefix; ungrouped parts render as direct leaves.

  The render function takes `{ part, children }` and dispatches on a single `switch (part.type)`. `"group-…"` cases wrap `children` (the recursively-rendered subtree); real part types (`"text"`, `"tool-call"`, `"reasoning"`, …) render the part directly with the same `EnrichedPartState` enrichments (`toolUI`, `addResult`, `resume`, `dataRendererUI`) that `<MessagePrimitive.Parts>` provides.

  `GroupPart` is intentionally minimal: `{ type, status, indices }`. The render function is invoked once per group node and once per individual leaf part, so users never have to nest a `<MessagePrimitive.Parts>` call.

  The `groupBy` return type is constrained to `` `group-${string}` `` so the unified switch can never collide with a real part type. The component infers a literal `TKey` per call site, so `part.type` narrows to the exact union of group keys plus part types.

  For leaf parts, `children` is a sentinel that throws if rendered — accidental fall-through like `default: return children;` errors loudly instead of silently rendering nothing. Returning `null` from a leaf case is fine.

  Deprecates the legacy `components.ToolGroup`, `components.ReasoningGroup`, and `components.ChainOfThought` props on `<Parts>`, and `<MessagePrimitive.Unstable_PartsGrouped>` for adjacent grouping — all still work for backwards compatibility.

## 0.1.16

### Patch Changes

- [#3895](https://github.com/assistant-ui/assistant-ui/pull/3895) [`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf) - fix(core): emit attachmentAddError when no adapter is configured or file type is rejected ([@okisdev](https://github.com/okisdev))

- [#3896](https://github.com/assistant-ui/assistant-ui/pull/3896) [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1) - fix(core): respect `adapter.accept` when adding external `CreateAttachment` ([@okisdev](https://github.com/okisdev))

  `composer.addAttachment` previously bypassed the configured `AttachmentAdapter` for `CreateAttachment` descriptors, including the `adapter.accept` content-type check. It now validates the descriptor's `contentType` (or filename extension) against `adapter.accept` when an adapter is configured, throwing and emitting `composer.attachmentAddError` on mismatch. Without an adapter, external attachments are still added as-is, preserving the existing "no adapter required" guarantee for external sources.

- [#3716](https://github.com/assistant-ui/assistant-ui/pull/3716) [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533) - fix(core): show loading state for empty parts children API ([@ShobhitPatra](https://github.com/ShobhitPatra))

- [#3891](https://github.com/assistant-ui/assistant-ui/pull/3891) [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9) - fix(core): hoist remote thread runtime binder out of `unstable_Provider` ([@okisdev](https://github.com/okisdev))

  `RemoteThreadListAdapter.unstable_Provider` is now allowed to render any subtree it likes; the runtime binding (composer state, `__internal_setGetInitializePromise`, `runEnd → generateTitle` listener) executes outside it. This fixes `EMPTY_THREAD_ERROR` when the Provider defers `children` (e.g. behind a history-loading state) and avoids the history-switch regression seen when only the binder, but not the init listeners, were hoisted. Adds a dev-mode warning when the Provider does not render `children` within ~100ms.

- [#3889](https://github.com/assistant-ui/assistant-ui/pull/3889) [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6) - feat: add `custom` slot to `RemoteThreadMetadata` and `ThreadListItemState` ([@okisdev](https://github.com/okisdev))

  allows adapter authors to carry arbitrary backend session data through `list()` / `fetch()` and surface it on the thread list item state. matches the existing `custom: Record<string, unknown>` convention used on `ThreadMessage`, `RunConfig`, and `ChatModelRunResult`. consumers can intersect a typed shape at their own boundary, e.g. `RemoteThreadMetadata & { custom: { workspaceId: string } }`.

- Updated dependencies [[`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e)]:
  - @assistant-ui/store@0.2.9
  - @assistant-ui/tap@0.5.10

## 0.1.15

### Patch Changes

- [#3857](https://github.com/assistant-ui/assistant-ui/pull/3857) [`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e) - fix(core): edit composer no longer re-injects original file parts when user message attachments are modified. Non-text content parts on user messages are lifted into `_attachments` so attachment removals take effect and files aren't duplicated on resend; non-user messages keep the existing content pass-through. ([@okisdev](https://github.com/okisdev))

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3796](https://github.com/assistant-ui/assistant-ui/pull/3796) [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836) - feat(react-langgraph): add uiComponents option for static and dynamic data renderers ([@ShobhitPatra](https://github.com/ShobhitPatra))

  Add `uiComponents` option to `useLangGraphRuntime` for registering static data renderers by name and a `fallback` renderer for dynamic loading (e.g. LangSmith's `LoadExternalComponent`), directly from the runtime hook.

  Core `DataRenderers` scope also gains a `fallbacks` stack (plus `setFallbackDataUI` method) that the adapter registers into; resolution is `renderers[name][0]` → `fallbacks[0]` → inline `Fallback`.

- [#3873](https://github.com/assistant-ui/assistant-ui/pull/3873) [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a) - feat(core): add `reload()` method on `ThreadListRuntime` and `aui.threads()` that re-invokes the remote adapter's `list()` and refreshes the thread list. Use this after asynchronous auth (e.g. OIDC, better-auth) completes to recover from an initial load that ran before the authenticated user was available. A generation counter ensures a mid-flight response from a superseded load cannot overwrite a newer reload's state. ([@okisdev](https://github.com/okisdev))

- [#3855](https://github.com/assistant-ui/assistant-ui/pull/3855) [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c) - fix: `useExternalStoreRuntime` now correctly initializes `mainThreadId`, `threadIds`, and `archivedThreadIds` from the adapter on first render. Previously they stayed at `DEFAULT_THREAD_ID` until the user switched threads, so `isMain` was `false` on initial load. Closes [#2577](https://github.com/assistant-ui/assistant-ui/issues/2577). ([@okisdev](https://github.com/okisdev))

- [#3859](https://github.com/assistant-ui/assistant-ui/pull/3859) [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568) - fix(core): `switchToThread` could duplicate a thread or leave it in both `threadIds` and `archivedThreadIds` when it raced with `list()`. Both arrays are now filtered before the status-keyed append, matching the `updateStatusReducer` pattern. ([@bilaltahseen](https://github.com/bilaltahseen))

- [#3858](https://github.com/assistant-ui/assistant-ui/pull/3858) [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1) - fix: `useAISDKRuntime` now throws when the supplied `ThreadHistoryAdapter` omits `withFormat`, instead of silently dropping all history load/append/update calls. The optional-call chain `historyAdapter.withFormat?.(…).load()` previously short-circuited to `undefined`. The `withFormat`-wrapped adapter is now memoized, and the persist effect short-circuits when no adapter is supplied (avoiding a redundant thread subscription). `ThreadHistoryAdapter.withFormat` gains a JSDoc note clarifying that it is required on the AI SDK path. ([@okisdev](https://github.com/okisdev))

- [#3831](https://github.com/assistant-ui/assistant-ui/pull/3831) [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063) - chore: remove decorative separator comments across packages ([@okisdev](https://github.com/okisdev))

- [#3872](https://github.com/assistant-ui/assistant-ui/pull/3872) [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c) - feat(core): let runtimes provide an explicit `isRunning` that overrides the last-message-status heuristic. `ExternalStoreAdapter.isRunning` now flows through to `thread.isRunning` directly, so applications can keep the thread in a running state even after the last assistant message has completed (e.g. while non-message stream chunks like suggestions, step-finish, or metadata updates are still arriving). When a runtime does not provide `isRunning`, the previous last-message-based behavior is preserved. ([@okisdev](https://github.com/okisdev))

- [#3834](https://github.com/assistant-ui/assistant-ui/pull/3834) [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd) - refactor: unify mention/slash under behavior sub-primitives; delete Mention/SlashCommand aliases and the `execute` field on `Unstable_TriggerItem`; split TriggerPopoverResource; rename react-lexical `MentionNode`/`MentionPlugin`/`MentionChipProvider`/`mentionChip` prop to `DirectiveNode`/`DirectivePlugin`/`DirectiveChipProvider`/`directiveChip`; fix IME/Unicode/copy-paste/undo bugs. Breaking (`Unstable_` APIs): replace `onSelect={{type:"insertDirective",formatter}}` with `<Unstable_TriggerPopover.Directive formatter={...}>`; replace `onSelect={{type:"action",handler}}` with `<Unstable_TriggerPopover.Action onExecute={...}>`. Rename `unstable_useToolMentionAdapter` → `unstable_useMentionAdapter` with new `items`/`categories`/`includeModelContextTools` options. `unstable_useSlashCommandAdapter` now returns `{ adapter, action }` — `execute` stays in the hook closure instead of on the item. Rename CSS class `aui-mention-chip` → `aui-directive-chip` and attributes `data-mention-*` → `data-directive-*`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063)]:
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.1.14

### Patch Changes

- f20b9ca: feat: add ExportedMessageRepository.fromBranchableArray() for constructing branching message trees from ThreadMessageLike messages
- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.1.13

### Patch Changes

- 42bc640: feat: support edit lineage and startRun in EditComposer send flow
  - Add `SendOptions` with `startRun` flag to `composer.send()`
  - Expose `parentId` and `sourceId` on `EditComposerState`
  - Add `EditComposerRuntimeCore` interface extending `ComposerRuntimeCore`
  - Bypass text-unchanged guard when `startRun` is explicitly set
  - `ComposerSendOptions` extends `SendOptions` for consistent layering

- 87e7761: feat: generalize mention system into trigger popover architecture with slash command support
  - Introduce `ComposerInputPlugin` protocol to decouple ComposerInput from mention-specific code
  - Extract generic `TriggerPopoverResource` from `MentionResource` supporting multiple trigger characters
  - Add `Unstable_TriggerItem`, `Unstable_TriggerCategory`, `Unstable_TriggerAdapter` generic types
  - Add `Unstable_SlashCommandAdapter`, `Unstable_SlashCommandItem` types
  - Add `ComposerPrimitive.Unstable_TriggerPopoverRoot` and related primitives
  - Add `ComposerPrimitive.Unstable_SlashCommandRoot` and related primitives
  - Add `unstable_useSlashCommandAdapter` hook for building slash command adapters
  - Refactor `MentionResource` as thin wrapper around `TriggerPopoverResource`
  - Alias `Unstable_MentionItem`/`Unstable_MentionAdapter` to generic trigger types
  - Update `react-lexical` `KeyboardPlugin` to use plugin protocol
  - All existing `Unstable_Mention*` APIs remain unchanged

- Updated dependencies [376bb00]
  - assistant-cloud@0.1.25
  - @assistant-ui/tap@0.5.7
  - @assistant-ui/store@0.2.6

## 0.1.12

### Patch Changes

- 19b1024: fix(core): move initialThreadId/threadId handling from constructor to \_\_internal_load to prevent SSR crash

## 0.1.11

### Patch Changes

- de29641: fix(core): start RemoteThreadList isLoading as true
- a8bf84b: feat(core): expose `getLoadThreadsPromise()` on `ThreadListRuntime` public API
- 5fd5c3d: feat(core): add reactive `threadId` option to `useRemoteThreadListRuntime` for URL-based routing
- ec50e8a: fix(core): prevent resolved history tool calls from re-executing
- Updated dependencies [2c5cd97]
  - assistant-stream@0.3.10

## 0.1.10

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

- 9103282: fix: resolve biome lint warnings (optional chaining, unused suppressions)
- 876f75d: feat: add interactable state persistence

  Add persistence API to interactables with exportState/importState, debounced setPersistenceAdapter, per-id isPending/error tracking, flush() for immediate sync, and auto-flush on component unregister.

- bdce66f: chore: update dependencies
- 4abb898: refactor: align interactables with codebase conventions
  - Rename `useInteractable` to `useAssistantInteractable` (registration only, returns id)
  - Add `useInteractableState` hook for reading/writing interactable state
  - Remove `makeInteractable` and related types
  - Rename `UseInteractableConfig` to `AssistantInteractableProps`
  - Extract `buildInteractableModelContext` from `Interactables` resource
  - Add `with-interactables` example to CLI

- 209ae81: chore: remove aui-source export condition from package.json exports
- af70d7f: feat: add useToolArgsStatus hook for per-prop streaming status

  Add a convenience hook that derives per-property streaming completion status from tool call args using structural partial JSON analysis.

- Updated dependencies [dffb6b4]
- Updated dependencies [9103282]
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
- Updated dependencies [2dd0c9f]
  - assistant-stream@0.3.9
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.1.9

### Patch Changes

- 781f28d: feat: accept all file types and validate against adapter's accept constraint
- 3227e71: feat: add interactables with partial updates, multi-instance, and selection
  - `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
  - `Interactables()` scope resource with auto-generated update tools and system prompt injection
  - Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
  - Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
  - Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt

- 0f55ce8: fix(core): hide phantom empty bubble when user message has no text content
- 83a15f7: feat(core): stream interactable state updates as tool args arrive
- 52403c3: chore: update dependencies
- ffa3a0f: feat(core): add attachmentAddError composer event
- Updated dependencies [3227e71]
- Updated dependencies [52403c3]
  - assistant-stream@0.3.8
  - assistant-cloud@0.1.23
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.1.8

### Patch Changes

- 1406aed: fix(core): prevent stale list() response from undoing concurrent delete/archive/unarchive in OptimisticState
- 9480f30: fix(core): stop thread runtime on delete to prevent store crash
- 28a987a: feat: SingleThreadList resource
  refactor: attachTransformScopes should mutate the scopes instead of cloning it
- 736344c: chore: update dependencies
- ff3be2a: Add @-mention system with cursor-aware trigger detection, keyboard navigation, search, and Lexical rich editor support
- 70b19f3: feat: add native queue and steer support
  - Add `queue` adapter to `ExternalThreadProps` for runtimes that support message queuing
  - Add `QueueItemPrimitive.Text`, `.Steer`, `.Remove` primitives for rendering queue items
  - Add `ComposerPrimitive.Queue` for rendering the queue list within the composer
  - Add `ComposerSendOptions` with `steer` flag to `composer.send()`
  - Add `capabilities.queue` to `RuntimeCapabilities`
  - `ComposerPrimitive.Send` stays enabled during runs when queue is supported
  - Cmd/Ctrl+Shift+Enter hotkey sends with `steer: true` (interrupt current run)
  - Add `queueItem` scope to `ScopeRegistry`
  - Add `queue` field to `ComposerState` and `queueItem()` method to `ComposerMethods`

- Updated dependencies [28a987a]
- Updated dependencies [736344c]
- Updated dependencies [c71cb58]
  - @assistant-ui/store@0.2.4
  - assistant-stream@0.3.7
  - @assistant-ui/tap@0.5.4

## 0.1.7

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote

## 0.1.6

### Patch Changes

- 1ed9867: feat: move resumeRun to stable
- 427ffaa: refactor: drop all barrel files
- 349f3c7: chore: update deps
- 02614aa: feat: add multi-agent support
  - `ReadonlyThreadProvider` and `MessagePartPrimitive.Messages` for rendering sub-agent messages
  - `assistant-stream`: add `messages` field to `tool-result` chunks, `ToolResponseLike`, and `ToolCallPart` types, enabling sub-agent messages to flow through the streaming protocol

- 6cc4122: refactor: use primitive hooks
- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
  - assistant-stream@0.3.6
  - assistant-cloud@0.1.22
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.1.5

### Patch Changes

- 990e41d: refactor: code sharing between the multiple platforms

## 0.1.4

### Patch Changes

- f032ea5: fix: restore `typeof process` runtime guard in useCloudThreadListAdapter
- Updated dependencies [2828b67]
  - assistant-stream@0.3.5

## 0.1.3

### Patch Changes

- 5ae74fe: fix: prevent double-submit when ComposerPrimitive.Send child has type="submit"
- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- 01bee2b: Remove zod dependency by using assistant-stream's toJSONSchema utility for schema serialization in AssistantFrameProvider

## 0.1.2

### Patch Changes

- 03714af: fix: DataRenderers not in scope

## 0.1.1

### Patch Changes

- a638f05: refactor(core): depend on @assistant-ui/store, register chat scopes via module augmentation
- 28f39fe: Support custom content types via `data-*` prefix in ThreadMessageLike (auto-converted to DataMessagePart), widen `BaseAttachment.type` to accept custom strings, make `contentType` optional
- 36ef3a2: chore: update dependencies
- 6692226: feat: support external source attachments in composer

  `addAttachment()` now accepts either a `File` or a `CreateAttachment` descriptor, allowing users to add attachments from external sources (URLs, API data, CMS references) without creating dummy `File` objects or requiring an `AttachmentAdapter`.

- c31c0fa: Extract shared React code (model-context, client, types, providers, RuntimeAdapter) into `@assistant-ui/core/react` sub-path so both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from one source.
- fc98475: feat(core): move `@assistant-ui/tap` to peerDependencies to fix npm deduplication
- 374f83a: fix(core): stabilize object references in ExternalStoreThreadRuntimeCore to prevent infinite re-render loop
- 1672be8: feat: bindExternalStoreMessage
- 14769af: refactor: move RuntimeAdapter base logic to @assistant-ui/core; re-export missing core APIs from distribution packages
- Updated dependencies [36ef3a2]
- Updated dependencies [fc98475]
- Updated dependencies [a638f05]
  - assistant-stream@0.3.4
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1

## 0.1.0

### Minor Changes

- 60bbe53: feat(core): ready for release

### Patch Changes

- 546c053: feat(core): extract subscribable, utils, and model-context; add public/internal API split
- a7039e3: feat(core): extract remote-thread-list and assistant-transport utilities to @assistant-ui/core
- 16c10fd: feat(core): extract runtime and adapters to @assistant-ui/core
- 40a67b6: feat(core): add message, attachment, and utility type definitions
- b181803: feat(core): introduce @assistant-ui/core package

  Extract framework-agnostic core from @assistant-ui/react. Replace React ComponentType references with framework-agnostic types and decouple AssistantToolProps/AssistantInstructionsConfig from React hook files.

- 4d7f712: feat(core): move runtime-to-client bridge to core/store for framework reuse
- ecc29ec: feat(core): move scope types and client implementations to @assistant-ui/core/store
- 6e97999: feat(core): move store tap infrastructure to @assistant-ui/core/store
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [b65428e]
- Updated dependencies [61b54e9]
- Updated dependencies [b65428e]
- Updated dependencies [93910bd]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - assistant-stream@0.3.3
