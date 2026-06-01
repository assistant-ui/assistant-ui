# @assistant-ui/react-opencode

## 0.2.4

### Patch Changes

- [#4151](https://github.com/assistant-ui/assistant-ui/pull/4151) [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3) - chore: drop stale `biome-ignore` pragmas now that the repo lints with oxlint ([@okisdev](https://github.com/okisdev))

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

- Updated dependencies [[`1315789`](https://github.com/assistant-ui/assistant-ui/commit/13157895e4d69ad4266d6ab278edfc2e3ea1de92), [`299d448`](https://github.com/assistant-ui/assistant-ui/commit/299d4488c8a5bbec0679680866f5975055fe71b3), [`4429aa3`](https://github.com/assistant-ui/assistant-ui/commit/4429aa32f6bd4fd50a7a8ddbad1e19f6ccad192b), [`0b99959`](https://github.com/assistant-ui/assistant-ui/commit/0b999594ff30ded9f804896093eab0478ac5ce46), [`e76611f`](https://github.com/assistant-ui/assistant-ui/commit/e76611fcb80a39d7b6071d82bcfaf1bb7345110b), [`eef724e`](https://github.com/assistant-ui/assistant-ui/commit/eef724efe4a9075337577c626d7ea7aead45cfbe), [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba), [`2d9595e`](https://github.com/assistant-ui/assistant-ui/commit/2d9595e04977ca16fb7edb1295309831945f4914), [`fcb6baf`](https://github.com/assistant-ui/assistant-ui/commit/fcb6baf161a9ee7dda65191e0b42de12b368724d)]:
  - @assistant-ui/react@0.14.12

## 0.2.3

### Patch Changes

- [#4123](https://github.com/assistant-ui/assistant-ui/pull/4123) [`4b95d4c`](https://github.com/assistant-ui/assistant-ui/commit/4b95d4c9510febbd5175f30884a87afa69f5adf8) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33)]:
  - @assistant-ui/react@0.14.10

## 0.2.2

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`b02b701`](https://github.com/assistant-ui/assistant-ui/commit/b02b7012cff158b4e73b82503b9ea90638b7398d), [`0a0c306`](https://github.com/assistant-ui/assistant-ui/commit/0a0c306286598ea885b046a1dfb85016f720051c), [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154), [`f2ec01c`](https://github.com/assistant-ui/assistant-ui/commit/f2ec01ce0f01317a8444b779d88f9b6a26d691c5)]:
  - @assistant-ui/react@0.14.8

## 0.2.1

### Patch Changes

- [#3925](https://github.com/assistant-ui/assistant-ui/pull/3925) [`53cdc51`](https://github.com/assistant-ui/assistant-ui/commit/53cdc51665a48dfeb0220455f6c32a34981e0b0e) - feat(react-opencode): track streaming timing via `useOpenCodeStreamingTiming` so `useMessageTiming()` works on OpenCode assistant messages ([@shashank-100](https://github.com/shashank-100))

- [#4068](https://github.com/assistant-ui/assistant-ui/pull/4068) [`22ae10e`](https://github.com/assistant-ui/assistant-ui/commit/22ae10e9f2c0ed34da9ea8b1aed5b56a9a8973dc) - fix(react-opencode): make the OpenCode runtime registry recover after React StrictMode cleanup. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47), [`b481ec5`](https://github.com/assistant-ui/assistant-ui/commit/b481ec5129e6c1ae6de2683cdafdeecff1d8ed6b), [`8f0dbb8`](https://github.com/assistant-ui/assistant-ui/commit/8f0dbb80a0c89c7406bad1ad397e75831b9b8fa7), [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917), [`693922b`](https://github.com/assistant-ui/assistant-ui/commit/693922b182b876b28d986f528b21d33da7c5bb51)]:
  - @assistant-ui/react@0.14.6

## 0.2.0

### Patch Changes

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

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/react@0.14.0

## 0.1.0

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`801b9a6`](https://github.com/assistant-ui/assistant-ui/commit/801b9a68d9c7c70ab15ca53842d0df6adacb7b86), [`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`aa6e071`](https://github.com/assistant-ui/assistant-ui/commit/aa6e071fdd6ea832c5aff3f6cf817b2e3eb6ceb0), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`df7eb3e`](https://github.com/assistant-ui/assistant-ui/commit/df7eb3eee6beeac72d3220707cf4660adf932586), [`f4a693e`](https://github.com/assistant-ui/assistant-ui/commit/f4a693ec1898f6ed0b81be47512fe51fd93a2de8), [`d864d07`](https://github.com/assistant-ui/assistant-ui/commit/d864d0709d9db5f8e042e62cf1f40669f087ba68)]:
  - @assistant-ui/react@0.13.0

## 0.0.4

### Patch Changes

- [#3885](https://github.com/assistant-ui/assistant-ui/pull/3885) [`eddd892`](https://github.com/assistant-ui/assistant-ui/commit/eddd8927404cbe05470979cfa6d4b5f87c270daa) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e)]:
  - @assistant-ui/react@0.12.27

## 0.0.3

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`9aa5410`](https://github.com/assistant-ui/assistant-ui/commit/9aa54107fc76509830309bb5e2c74984408b97fe), [`a1f84ae`](https://github.com/assistant-ui/assistant-ui/commit/a1f84ae7b7782be19a25369905171de997f327ac), [`b4fde97`](https://github.com/assistant-ui/assistant-ui/commit/b4fde97355b51ed7a35401eeed0e5f5943a51150), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd), [`477fa8a`](https://github.com/assistant-ui/assistant-ui/commit/477fa8a4c94d8922f5639dac8888fc55926f36cd)]:
  - @assistant-ui/react@0.12.26

## 0.0.2

### Patch Changes

- c988db8: chore: update dependencies
- 11451c2: feat: initial experimental release of OpenCode runtime adapter
- Updated dependencies [c988db8]
  - @assistant-ui/react@0.12.25
