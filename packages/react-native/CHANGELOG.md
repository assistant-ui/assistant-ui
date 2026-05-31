# @assistant-ui/react-native

## 0.1.19

### Patch Changes

- [#4160](https://github.com/assistant-ui/assistant-ui/pull/4160) [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b) - feat: add `indicator` support to `MessagePrimitive.GroupedParts`. ([@Yonom](https://github.com/Yonom))

  Restores loading-state handling that was dropped from the grouped renderer. `GroupedParts` now emits a synthetic `{ part: { type: "indicator" } }` render call you handle with `case "indicator"` in your `switch (part.type)` — render a "thinking…" dot or any loading affordance.
  - The indicator is only ever emitted while the message is **running**, so its presence alone means "render loading UI here" — there's no `status` to branch on.
  - New `indicator` prop restricts which running states qualify: `"never"`, `"empty"` (no parts yet), `"no-text"` (default — last part isn't `text`/`reasoning`, e.g. the model ended on a tool call), or `"always"` (any running state).

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4167](https://github.com/assistant-ui/assistant-ui/pull/4167) [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d) - feat: add a `display` presentation hint to tools and a `"standalone-tool-call"` key to `groupPartByType`. ([@Yonom](https://github.com/Yonom))

  Tool UIs fall into three buckets: prompting the user (human-in-the-loop), informing the user (generative UI), and traces of what the model is doing (routine frontend/backend tool calls). The first two should be surfaced on their own; the last belongs folded into the chain-of-thought trace. The new `display` field on a tool lets you place a tool in the right bucket without overloading `type`:

  ```ts
  const toolkit = {
    ask_user: { type: "human", render: AskUI }, // standalone (forced — can't opt out)
    search_web: { type: "frontend", render: SearchUI }, // inline trace (default)
    checkout: {
      type: "frontend",
      render: CheckoutUI,
      display: "standalone", // opt in
    },
  } satisfies Toolkit;
  ```

  - `display?: "standalone" | "inline"` is a client-only presentation hint (it never reaches the model). Defaults to `"inline"`.
  - `human` tools are always `"standalone"` and cannot opt out (the type only allows `"standalone"`). MCP-app tool calls and the built-in generative-UI tool are standalone too. Every other tool defaults to inline and opts in explicitly.
  - `groupPartByType` gains a synthetic `"standalone-tool-call"` key that matches all of the above. `MessagePrimitive.GroupedParts` passes the live tool-UI registry to the `groupBy` function as a second `context` argument (`{ toolUIs }`), and the helper reads it to resolve the registry-driven cases; MCP-app calls are detected from the part alone.
  - The `"mcp-app"` key on `groupPartByType` is **deprecated** in favor of `"standalone-tool-call"` (a superset). It still works for back-compat.

  The shadcn `thread.tsx` template is updated to use `"standalone-tool-call": []` in place of `"mcp-app": []`.

- [#4128](https://github.com/assistant-ui/assistant-ui/pull/4128) [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8
  - @assistant-ui/store@0.2.13
  - @assistant-ui/tap@0.5.14

## 0.1.18

### Patch Changes

- [#4120](https://github.com/assistant-ui/assistant-ui/pull/4120) [`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a) - feat: simplify `MessagePrimitive.GroupedParts` API and add `groupPartByType` helper. ([@Yonom](https://github.com/Yonom))
  - New `groupPartByType({ ... })` helper builds a `groupBy` from a `part.type → group-key path` lookup. The map keys are typed against `PartState["type"]` (autocomplete + typo rejection), missing keys leave the part ungrouped, and the returned function carries an internal memo fingerprint so the tree survives unrelated re-renders even when reconstructed inline.
  - Special map key `"mcp-app"` matches tool-call parts that point at an assistant-ui MCP app resource (`ui://...`). It takes precedence over the `"tool-call"` entry for those parts, so MCP apps can be routed separately (e.g. rendered outside a chain-of-thought wrapper).
  - `groupBy` signature simplified from `(part, index, parts) => string | string[] | null | undefined` to `(part) => readonly \`group-${string}\`[] | null`. The 2nd/3rd args were unused in practice. Arrays are required (no bare-string shorthand); `null`is accepted as an alias for`[]` to soften the migration.
  - Internal memoization now uses the helper's memo fingerprint when present, otherwise rebuilds the tree per render (O(n), cheap). The previous "pass a stable reference" advice is dropped — inline `groupBy` is fine.
  - Docs and examples updated to lead with `groupPartByType`. The `getMcpAppFromToolPart` branch in `packages/ui` switches to `"mcp-app": []` via the helper.

- [#4107](https://github.com/assistant-ui/assistant-ui/pull/4107) [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4) - feat: surface AI SDK v6 tool approvals as a first-class `respondToApproval` prop on tool components. tool-call parts in the `approval-requested` state now carry `part.approval = { id, isAutomatic? }`; tool components call `respondToApproval({ approved, reason? })` to ack the gate without threading `chatHelpers` through application context. also fixes a transient `requires-action` flicker for the `approval-responded` state and tightens the external-message converter so interrupt vs pending tool calls are distinguished by an actual `interrupt`/`approval` field rather than by `result === undefined`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`372d4f0`](https://github.com/assistant-ui/assistant-ui/commit/372d4f0c538a766fd9a849fef74e413dde86d74a), [`d4f1db4`](https://github.com/assistant-ui/assistant-ui/commit/d4f1db428b1a1fe5c122150e1e366a377e9adb5f), [`32ae846`](https://github.com/assistant-ui/assistant-ui/commit/32ae846a91b61eccd01330693868a48f2f3bb0c4)]:
  - @assistant-ui/core@0.2.6
  - assistant-stream@0.3.17

## 0.1.17

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4095](https://github.com/assistant-ui/assistant-ui/pull/4095) [`fa62e49`](https://github.com/assistant-ui/assistant-ui/commit/fa62e49425fcfa94581cbd24fd6fcfff324d77e9) - fix(react-native): support the children render-prop API on `ThreadPrimitive.Messages` ([@okisdev](https://github.com/okisdev))

  `@assistant-ui/core/react`'s `ThreadPrimitive.Messages` was updated in [#3642](https://github.com/assistant-ui/assistant-ui/issues/3642) to accept either `components` or a `children` render function, and the docs and `examples/with-expo` were switched to the children form. The React Native primitive (`FlatList`-backed, separate implementation) was missed in that pass and kept requiring `components`, so the example crashed at runtime with `Cannot read property 'UserMessage' of undefined` (from `getComponent(undefined, role, isEditing)`).

  Mirrors the core/react shape: `ThreadMessagesProps` is now a union of `{ components }` or `{ children }`, with a new `ThreadMessageByChildren` that wraps each row in `MessageByIndexProvider` + `RenderChildrenWithAccessor` so consumers get a lazy `{ message }` accessor without subscribing the row to the full message state. The `components` path is unchanged.

  ```tsx
  <ThreadPrimitive.Messages>{() => <MessageBubble />}</ThreadPrimitive.Messages>
  ```

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5
  - @assistant-ui/store@0.2.12
  - @assistant-ui/tap@0.5.12

## 0.1.16

### Patch Changes

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

- Updated dependencies [[`9ecda1d`](https://github.com/assistant-ui/assistant-ui/commit/9ecda1dfdd96f2c638e7b51cc951319ccacd06c9), [`35d0146`](https://github.com/assistant-ui/assistant-ui/commit/35d014628a69b0003799666895c2552b46ac7198), [`fa4510a`](https://github.com/assistant-ui/assistant-ui/commit/fa4510a3f3a23e0458ce8f3a397c352e3b0cde07), [`c9dd16c`](https://github.com/assistant-ui/assistant-ui/commit/c9dd16c4b1edc52f6a2529a9a07ebb7964aee9a1), [`dea8bc7`](https://github.com/assistant-ui/assistant-ui/commit/dea8bc7e122ad6ff53e48e6b0ffc6fcc2abaadd3), [`9c3d24d`](https://github.com/assistant-ui/assistant-ui/commit/9c3d24d8a358bcf5f683f85473b82524ea018930)]:
  - assistant-stream@0.3.14
  - @assistant-ui/core@0.2.1

## 0.1.15

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.1.14

### Patch Changes

- [#3932](https://github.com/assistant-ui/assistant-ui/pull/3932) [`6700da5`](https://github.com/assistant-ui/assistant-ui/commit/6700da5a4a435779311eb7db90211738b18f55c9) - feat: re-export RuntimeAdapterProvider, useRuntimeAdapters, and CompleteAttachment ([@AVGVSTVS96](https://github.com/AVGVSTVS96))

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10
  - @assistant-ui/tap@0.5.11

## 0.1.13

### Patch Changes

- [#3853](https://github.com/assistant-ui/assistant-ui/pull/3853) [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4) - feat: add `<MessagePrimitive.GroupedParts>` for hierarchical adjacent grouping of message parts ([@Yonom](https://github.com/Yonom))

  Introduces a new primitive that coalesces adjacent parts into groups via a user-supplied `groupBy(part) → "group-…" | readonly "group-…"[] | null`. Adjacent parts sharing a key-path prefix coalesce up to that prefix; ungrouped parts render as direct leaves.

  The render function takes `{ part, children }` and dispatches on a single `switch (part.type)`. `"group-…"` cases wrap `children` (the recursively-rendered subtree); real part types (`"text"`, `"tool-call"`, `"reasoning"`, …) render the part directly with the same `EnrichedPartState` enrichments (`toolUI`, `addResult`, `resume`, `dataRendererUI`) that `<MessagePrimitive.Parts>` provides.

  `GroupPart` is intentionally minimal: `{ type, status, indices }`. The render function is invoked once per group node and once per individual leaf part, so users never have to nest a `<MessagePrimitive.Parts>` call.

  The `groupBy` return type is constrained to `` `group-${string}` `` so the unified switch can never collide with a real part type. The component infers a literal `TKey` per call site, so `part.type` narrows to the exact union of group keys plus part types.

  For leaf parts, `children` is a sentinel that throws if rendered — accidental fall-through like `default: return children;` errors loudly instead of silently rendering nothing. Returning `null` from a leaf case is fine.

  Deprecates the legacy `components.ToolGroup`, `components.ReasoningGroup`, and `components.ChainOfThought` props on `<Parts>`, and `<MessagePrimitive.Unstable_PartsGrouped>` for adjacent grouping — all still work for backwards compatibility.

- Updated dependencies [[`0bbf5dd`](https://github.com/assistant-ui/assistant-ui/commit/0bbf5dd7357c0993958a2e8e55eb60705eca3207), [`98f165c`](https://github.com/assistant-ui/assistant-ui/commit/98f165ca83c4df9b9133eb4ce4fdf8c7a06886bb), [`62ec5bd`](https://github.com/assistant-ui/assistant-ui/commit/62ec5bd3368fb69ea7bcde275858e0ea8fa1d59b), [`6a919c1`](https://github.com/assistant-ui/assistant-ui/commit/6a919c1fa21113080f46dd0e08142c939dad3ea4)]:
  - @assistant-ui/core@0.1.17

## 0.1.12

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`055dda5`](https://github.com/assistant-ui/assistant-ui/commit/055dda54b68031d0c9c760bf89a7c1036dd2174d), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12
  - @assistant-ui/store@0.2.8
  - @assistant-ui/tap@0.5.9

## 0.1.11

### Patch Changes

- 0d2d2f3: fix: export ExportedMessageRepository and ExportedMessageRepositoryItem from react-native
- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - @assistant-ui/store@0.2.7
  - @assistant-ui/tap@0.5.8

## 0.1.10

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - @assistant-ui/tap@0.5.7

## 0.1.9

### Patch Changes

- 6554892: feat: add useAssistantContext for dynamic context injection

  Register a callback-based context provider that injects computed text into the system prompt at evaluation time, ensuring the prompt always reflects current application state.

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
  - @assistant-ui/store@0.2.6
  - @assistant-ui/tap@0.5.6

## 0.1.8

### Patch Changes

- 3227e71: feat: add interactables with partial updates, multi-instance, and selection
  - `useInteractable(name, config)` hook and `makeInteractable` factory for registering AI-controllable UI
  - `Interactables()` scope resource with auto-generated update tools and system prompt injection
  - Partial updates — auto-generated tools use partial schemas so AI only sends changed fields
  - Multi-instance support — same name with different IDs get separate `update_{name}_{id}` tools
  - Selection — `setSelected(true)` marks an interactable as focused, surfaced as `(SELECTED)` in system prompt

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
  - @assistant-ui/store@0.2.5
  - @assistant-ui/tap@0.5.5

## 0.1.7

### Patch Changes

- 736344c: chore: update dependencies
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
  - @assistant-ui/tap@0.5.4

## 0.1.6

### Patch Changes

- 7ecc497: feat: children API for primitives with part.toolUI, part.dataRendererUI, and MessagePrimitive.Quote
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7

## 0.1.5

### Patch Changes

- 4a904de: refactor: remove useAssistantRuntime hook
- 349f3c7: chore: update deps
- 6cc4122: refactor: use primitive hooks
- 642bcda: Add `quote.tsx` registry components and `injectQuoteContext` helper
- Updated dependencies [1ed9867]
- Updated dependencies [427ffaa]
- Updated dependencies [349f3c7]
- Updated dependencies [02614aa]
- Updated dependencies [6cc4122]
- Updated dependencies [642bcda]
  - @assistant-ui/core@0.1.6
  - assistant-stream@0.3.6
  - @assistant-ui/store@0.2.3
  - @assistant-ui/tap@0.5.3

## 0.1.4

### Patch Changes

- 990e41d: refactor: code sharing between the multiple platforms
- Updated dependencies [990e41d]
  - @assistant-ui/core@0.1.5

## 0.1.3

### Patch Changes

- 8ed9d6f: Add optional `aui` parameter to AssistantRuntimeProvider for passing an AssistantClient
- 8ed9d6f: Refactor React Native component API: move shared runtime logic (remote thread list, external store, cloud adapters, message converter, tool invocations) into @assistant-ui/core for reuse across React and React Native
- Updated dependencies [5ae74fe]
- Updated dependencies [8ed9d6f]
- Updated dependencies [01bee2b]
  - @assistant-ui/core@0.1.3

## 0.1.2

### Patch Changes

- a845911: chore: update dependencies
- Updated dependencies [a845911]
  - @assistant-ui/store@0.2.2
  - @assistant-ui/tap@0.5.2

## 0.1.1

### Patch Changes

- 36ef3a2: chore: update dependencies
- c31c0fa: Extract shared React code (model-context, client, types, providers, RuntimeAdapter) into `@assistant-ui/core/react` sub-path so both `@assistant-ui/react` and `@assistant-ui/react-native` re-export from one source.
- 14769af: refactor: move RuntimeAdapter base logic to @assistant-ui/core; re-export missing core APIs from distribution packages
- f8abe87: feat(react-native): add attachment primitives and useComposerAddAttachment hook
- a638f05: refactor(react-native): import generic store utilities from @assistant-ui/store, remove deprecated hooks in favor of useAuiState
- d74d309: feat(react-native): add tool system, model context hooks, and data renderers
- 8a78cd2: fix: stabilize runtimeHook identity in useRemoteThreadListRuntime to avoid unnecessary option updates and thread state churn
- Updated dependencies [a638f05]
- Updated dependencies [28f39fe]
- Updated dependencies [36ef3a2]
- Updated dependencies [6692226]
- Updated dependencies [c31c0fa]
- Updated dependencies [fc98475]
- Updated dependencies [374f83a]
- Updated dependencies [fc98475]
- Updated dependencies [1672be8]
- Updated dependencies [14769af]
- Updated dependencies [a638f05]
  - @assistant-ui/core@0.1.1
  - assistant-stream@0.3.4
  - @assistant-ui/store@0.2.1
  - @assistant-ui/tap@0.5.1

## 0.1.0

### Minor Changes

- 124ae9f: feat(react-native): setup
- ef5d622: feat(react-native): integrate store system

### Patch Changes

- 9276547: fix: thread deletion crash "Entry not available in the store"
- f116f55: feat(react-native): use core's RemoteThreadList infrastructure
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [546c053]
- Updated dependencies [a7039e3]
- Updated dependencies [16c10fd]
- Updated dependencies [40a67b6]
- Updated dependencies [b65428e]
- Updated dependencies [b181803]
- Updated dependencies [b65428e]
- Updated dependencies [6bd6419]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
- Updated dependencies [61b54e9]
- Updated dependencies [4d7f712]
- Updated dependencies [ecc29ec]
- Updated dependencies [6e97999]
- Updated dependencies [b65428e]
- Updated dependencies [93910bd]
- Updated dependencies [60bbe53]
- Updated dependencies [b65428e]
- Updated dependencies [b65428e]
  - @assistant-ui/tap@0.5.0
  - @assistant-ui/store@0.2.0
  - @assistant-ui/core@0.1.0
  - assistant-stream@0.3.3
