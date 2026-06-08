# @assistant-ui/react-google-adk

## 0.0.15

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`2a84174`](https://github.com/assistant-ui/assistant-ui/commit/2a8417422996920c4a58be80eddc1c1740158518), [`a0a0769`](https://github.com/assistant-ui/assistant-ui/commit/a0a076915dafdb7152c9fde75b40cfddebcb2676), [`19c5b5f`](https://github.com/assistant-ui/assistant-ui/commit/19c5b5f3b1616a82ddfa928325c5e02c5786e867), [`dbdfb15`](https://github.com/assistant-ui/assistant-ui/commit/dbdfb15e8b609d3886c71fedb25a9d8345e5fc3c), [`ca191dc`](https://github.com/assistant-ui/assistant-ui/commit/ca191dc63f4a63c7d3f98566e9febd7d7f857aec), [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc), [`44ff4bf`](https://github.com/assistant-ui/assistant-ui/commit/44ff4bf5765ec2675454362a00214cd9de5cfb60), [`01cf957`](https://github.com/assistant-ui/assistant-ui/commit/01cf957c209b1a58c69f5621565397de6d1eb794), [`26a365b`](https://github.com/assistant-ui/assistant-ui/commit/26a365bb2b5bf840e21cd0caf1870627fb57c045)]:
  - @assistant-ui/core@0.2.11
  - assistant-stream@0.3.21
  - assistant-cloud@0.1.32
  - @assistant-ui/store@0.2.14

## 0.0.14

### Patch Changes

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`cba2b42`](https://github.com/assistant-ui/assistant-ui/commit/cba2b42c26083e730ae07194186ab4473f9f4cf3), [`4145caa`](https://github.com/assistant-ui/assistant-ui/commit/4145caaa23452f38c71366b55c03f8ec4da3fd54), [`58f80e0`](https://github.com/assistant-ui/assistant-ui/commit/58f80e09b51a9d025403f8692c3f41adc6d403e0), [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab), [`5fe118d`](https://github.com/assistant-ui/assistant-ui/commit/5fe118d6e61fd661859ee0d6b5ef10a370992a84), [`dcd5897`](https://github.com/assistant-ui/assistant-ui/commit/dcd5897f6dd6ca6bfe6978c3c03371e070965eab), [`0558db2`](https://github.com/assistant-ui/assistant-ui/commit/0558db28952fcd1c05a2ea3f15020cf50ca52489), [`69540af`](https://github.com/assistant-ui/assistant-ui/commit/69540af906f4301af0fd453b0ab425fd62703a46), [`d9b3119`](https://github.com/assistant-ui/assistant-ui/commit/d9b311977759818fcdcea6037c938e7070276f47), [`ae54c55`](https://github.com/assistant-ui/assistant-ui/commit/ae54c55c8c8b0f9e9ef455ced1498f37d998c6cb), [`7640b31`](https://github.com/assistant-ui/assistant-ui/commit/7640b319f704414bd5eb197f34e11ae0b2324a1d)]:
  - assistant-stream@0.3.20
  - @assistant-ui/core@0.2.10
  - assistant-cloud@0.1.31

## 0.0.13

### Patch Changes

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

- [#4136](https://github.com/assistant-ui/assistant-ui/pull/4136) [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b) - centralize thread-level shared options forwarding across runtime wrapper hooks. follow-up to [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). ([@okisdev](https://github.com/okisdev))

  new public exports from `@assistant-ui/core` (re-exported from `@assistant-ui/react`):
  - `ExternalStoreSharedOptions`, a typed `Pick` over `ExternalStoreAdapter` covering the four thread-level optional fields every wrapper forwards: `isDisabled`, `isSendDisabled`, `unstable_capabilities`, `suggestions`.
  - `pickExternalStoreSharedOptions(options)`, plucks those four fields from a wider options object. the body uses `satisfies Required<...>` so adding a key to the type without copying it in the function is a compile error rather than a silent missing-field bug.
  - `useExternalStoreSharedOptions(options)` (from `@assistant-ui/core/react`), a memoized variant for wrappers that wrap their store in `useMemo`. lets the wrapper list a single stable `shared` reference as a dep instead of enumerating the four fields. same `satisfies` guard internally so the destructure stays in sync with the type.

  internal: every runtime wrapper hook (`useChatRuntime`, `useAISDKRuntime`, `useLangGraphRuntime`, `useA2ARuntime`, `useAgUiRuntime`, `useAdkRuntime`, `useStreamRuntime`, `useOpenCodeRuntime`) now uses these helpers instead of inlining the conditional spreads added in [#4135](https://github.com/assistant-ui/assistant-ui/issues/4135). each wrapper sheds 20 to 40 lines of duplicated declarations and conditional spreads; future additions to the shared option set propagate through a single edit in `pickExternalStoreSharedOptions` instead of touching every wrapper. no user-facing behavior change.

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

- [#4128](https://github.com/assistant-ui/assistant-ui/pull/4128) [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`76f7d16`](https://github.com/assistant-ui/assistant-ui/commit/76f7d161c2d802b72e07a12f67595f94c9ad7e4d), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d), [`c4d3eea`](https://github.com/assistant-ui/assistant-ui/commit/c4d3eeac6907a2fc15718f3c710d73d24eaeb652), [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e)]:
  - assistant-stream@0.3.18
  - @assistant-ui/core@0.2.8
  - @assistant-ui/store@0.2.13
  - assistant-cloud@0.1.30

## 0.0.12

### Patch Changes

- [#4125](https://github.com/assistant-ui/assistant-ui/pull/4125) [`e639a11`](https://github.com/assistant-ui/assistant-ui/commit/e639a11838642aa111644077ba51acf6277051f2) - chore: drop tracker-behaviour explainer comments left behind in satellite runtimes ([@Yonom](https://github.com/Yonom))

## 0.0.11

### Patch Changes

- [#3967](https://github.com/assistant-ui/assistant-ui/pull/3967) [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c) - feat(core, react): add `MessagePrimitive.GenerativeUI` primitive ([@samdickson22](https://github.com/samdickson22))

  A new first-class primitive for rendering agent-described React UI from a JSON
  spec, with a consumer-provided component allowlist as the security boundary.

  The agent emits a new `generative-ui` message part containing a tree of
  components by name; `MessagePrimitive.GenerativeUI` walks the spec and resolves
  each name against the registry you pass in. Unknown names throw a typed
  `GenerativeUIRenderError` (or invoke the optional `Fallback`). Composes with
  `MessagePrimitive.Parts` via the new `components.generativeUI` option, and
  supports streaming partial specs.

  ```tsx
  <MessagePrimitive.Parts
    components={{
      generativeUI: { components: { Card, Button } },
    }}
  />
  ```

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`13a12c4`](https://github.com/assistant-ui/assistant-ui/commit/13a12c46c94f7e5e62af02692cf3479fff48bd02), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`6a0ecb2`](https://github.com/assistant-ui/assistant-ui/commit/6a0ecb2e49f24c5f066052018db5a9f1411dcc59), [`e4634a5`](https://github.com/assistant-ui/assistant-ui/commit/e4634a59b7a926d158e929d559326f243efe438b), [`325de4c`](https://github.com/assistant-ui/assistant-ui/commit/325de4c73b348d4c20dafa4a2ac6d436c69dbf28), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5), [`1e21076`](https://github.com/assistant-ui/assistant-ui/commit/1e2107648bc281f1673f4ad053fd019b28a602d0)]:
  - assistant-stream@0.3.16
  - @assistant-ui/core@0.2.5
  - assistant-cloud@0.1.29
  - @assistant-ui/store@0.2.12

## 0.0.10

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.0.9

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10

## 0.0.8

### Patch Changes

- [#3894](https://github.com/assistant-ui/assistant-ui/pull/3894) [`d3380f4`](https://github.com/assistant-ui/assistant-ui/commit/d3380f4bb7b93960a7e7be86aceb3428ea29e4f2) - fix(react-google-adk): add missing DictationAdapter to UseAdkRuntimeOptions ([@okisdev](https://github.com/okisdev))

- [#3905](https://github.com/assistant-ui/assistant-ui/pull/3905) [`d0b72cb`](https://github.com/assistant-ui/assistant-ui/commit/d0b72cba74bc8f3acfd6b3d1ca065c3270d092b7) - fix(react-google-adk): preserve file attachment data on the wire ([@okisdev](https://github.com/okisdev))

  `useAdkRuntime.getMessageContent` previously collapsed file message parts into a `[File: <name>]` text marker before sending to ADK, dropping the base64 payload entirely. new `file` and `file_url` variants on `AdkMessageContentPart` carry the binary through `AdkClient` and `useAdkMessages.contentToParts`, which serialize them as `inlineData` and `fileData` on the wire. inbound, `AdkEventAccumulator` sniffs MIME type so non-image `inlineData` produces a `file` part (rather than being silently coerced into `image`), and explicitly non-image `fileData` produces `file_url`; `fileData` with no MIME type falls back to `image_url` to preserve the legacy round-trip. `convertAdkMessage` maps `file` to a core `FileMessagePart` and `file_url` to a `data` part named `"file_url"`.

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/store@0.2.9

## 0.0.7

### Patch Changes

- [#3843](https://github.com/assistant-ui/assistant-ui/pull/3843) [`c15a958`](https://github.com/assistant-ui/assistant-ui/commit/c15a9584cdbd6dd71fd45b8d3748ee30d8a2c3b9) - fix(react-google-adk): return the ADK session id as `remoteId` from `createAdkSessionAdapter().initialize()`. Previously the input `threadId` (an internal `__LOCALID_*`) was returned, so later `delete(remoteId)` calls hit `/sessions/__LOCALID_*` and 404'd — masked by the adapter's tolerated 404 on delete. ([@okisdev](https://github.com/okisdev))

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8

## 0.0.6

### Patch Changes

- 147c1b8: fix(react-google-adk): render user-authored events as human messages

  `AdkEventAccumulator.processEvent` previously routed `author: "user"` events through `getOrCreateAiMessage`, producing `type: "ai"` messages that `convertAdkMessage` mapped to `role: "assistant"` — so user text rendered as assistant bubbles. With Workflow agents this caused full multi-turn conversations to merge into a single assistant block. User events now create `type: "human"` messages, preserving text, inline images, and file references.

- 9abb15c: fix(react-google-adk): allow HITL interrupt tool UIs to render with `requires-action` status
  - `makeAssistantToolUI` for HITL tools (`adk_request_input`, etc.) can now use `status.type === "requires-action"` to render input forms
  - Non-HITL final events still receive their manual `complete` status

- 4d2531e: fix(react-google-adk): don't auto-cancel HITL interrupts when user sends a new message
  - `useAdkRuntime.onNew` now filters pending tool calls whose id is tracked in `long_running_tool_ids`, so ADK HITL interrupts (`adk_request_input`, `adk_request_confirmation`, `adk_request_credential`) are no longer overwritten with `{cancelled: true}` when the user types a new message
  - Add `useAdkSubmitInput(toolCallId, result)` to submit the user's answer as a `{result}` FunctionResponse, matching ADK's `unwrap_response` contract so Workflow `RequestInput` nodes resume with the unwrapped value
  - `AdkEventAccumulator` unions `long_running_tool_ids` across events instead of replacing, so multiple HITL interrupts in the same turn are all tracked
  - `onEdit` / `onReload` / session load paths now reset derived HITL state (`longRunningToolIds`, `toolConfirmations`, `authRequests`, `escalated`) via a new `replaceMessages` helper on `useAdkMessages`, so stale interrupt markers don't leak into the next turn

  **Behavior change:** HITL interrupts must now be answered through a tool UI using the dedicated submit helpers (`useAdkSubmitInput`, `useAdkConfirmTool`, `useAdkSubmitAuth`). Typing in the composer while an interrupt is pending no longer sends a spurious cancellation.

- c988db8: chore: update dependencies
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7

## 0.0.5

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [42bc640]
- Updated dependencies [376bb00]
- Updated dependencies [87e7761]
  - @assistant-ui/core@0.1.13
  - assistant-cloud@0.1.25

## 0.0.4

### Patch Changes

- 5e23896: fix: skip partial functionCall events in AdkEventAccumulator to prevent incomplete tool calls from hanging the runtime
- Updated dependencies [de29641]
- Updated dependencies [a8bf84b]
- Updated dependencies [5fd5c3d]
- Updated dependencies [2c5cd97]
- Updated dependencies [ec50e8a]
  - @assistant-ui/core@0.1.11
  - assistant-stream@0.3.10

## 0.0.3

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
- Updated dependencies [2dd0c9f]
- Updated dependencies [af70d7f]
  - assistant-stream@0.3.9
  - @assistant-ui/core@0.1.10
  - assistant-cloud@0.1.24
  - @assistant-ui/store@0.2.6

## 0.0.2

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

## 0.0.1

### Patch Changes

- 69886fd: feat: add Google ADK adapter package
- Updated dependencies [7ecc497]
  - @assistant-ui/core@0.1.7
