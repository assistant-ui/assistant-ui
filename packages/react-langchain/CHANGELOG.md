# @assistant-ui/react-langchain

## 0.0.9

### Patch Changes

- [#4123](https://github.com/assistant-ui/assistant-ui/pull/4123) [`4b95d4c`](https://github.com/assistant-ui/assistant-ui/commit/4b95d4c9510febbd5175f30884a87afa69f5adf8) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7395092`](https://github.com/assistant-ui/assistant-ui/commit/73950929dbebadb275e3bdee23331f65f2635a33), [`a6e0653`](https://github.com/assistant-ui/assistant-ui/commit/a6e0653bad29fb93627646a77c3383000c57ee33)]:
  - @assistant-ui/core@0.2.7

## 0.0.8

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

## 0.0.7

### Patch Changes

- [#4049](https://github.com/assistant-ui/assistant-ui/pull/4049) [`3eaf583`](https://github.com/assistant-ui/assistant-ui/commit/3eaf58311a9fbecfdf18c5b8771aba3338f85c7c) - feat(react-langchain): parity options + send hooks (toward deprecating `react-langgraph`) ([@Yonom](https://github.com/Yonom))
  - Adds `autoCancelPendingToolCalls` (default `true`): when a new user
    message is submitted while previous tool calls are still pending,
    automatically submit `tool` messages cancelling them so the agent's
    tool-call accounting stays consistent.
  - Adds `unstable_allowCancellation`: routes the Cancel button to
    `useStream().stop()`. On by default; pass `false` to disable.
  - Adds `unstable_threadListAdapter`: custom `RemoteThreadListAdapter`
    override for self-hosted persistence (takes precedence over `cloud`).
  - Adds `create` and `delete` options, forwarded to the underlying
    `useCloudThreadListAdapter`.
  - Adds `useLangChainSend()` and `useLangChainSendCommand()` parity
    helpers for migrating away from `useLangGraphSend` /
    `useLangGraphSendCommand`.

- [#4048](https://github.com/assistant-ui/assistant-ui/pull/4048) [`94c2c8e`](https://github.com/assistant-ui/assistant-ui/commit/94c2c8ea453ac12a6121b70b91381ab936556cd5) - chore: bump `@langchain/react` peer dependency to `^1.0.2` (v1 useStream API) ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710), [`db721df`](https://github.com/assistant-ui/assistant-ui/commit/db721df32434296ac14eab27030628107975b71c), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`94548fa`](https://github.com/assistant-ui/assistant-ui/commit/94548fa8d587962d8ab0338a9609a9ff21240c33), [`8b6fc88`](https://github.com/assistant-ui/assistant-ui/commit/8b6fc8836871e62efc2fd8c131c6783e12c5fc47), [`179895f`](https://github.com/assistant-ui/assistant-ui/commit/179895fdcb56edee2e8d9efb4b38cd3859eeecdd), [`7a8bf26`](https://github.com/assistant-ui/assistant-ui/commit/7a8bf26eda76f5f8490f96b3ff9dce1ccd072917), [`3b2bbce`](https://github.com/assistant-ui/assistant-ui/commit/3b2bbce1589b44a13b8b7a570c19bf35a2266fbd)]:
  - assistant-cloud@0.1.28
  - @assistant-ui/store@0.2.11
  - assistant-stream@0.3.15
  - @assistant-ui/core@0.2.3

## 0.0.6

### Patch Changes

- Updated dependencies [[`040d469`](https://github.com/assistant-ui/assistant-ui/commit/040d469acfcf782de6fc188c646dfd8732d27088)]:
  - @assistant-ui/core@0.2.0

## 0.0.5

### Patch Changes

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`7098bab`](https://github.com/assistant-ui/assistant-ui/commit/7098bab4c67fbd507c3fad746ef130daa01b3fd6), [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94), [`5fdf17e`](https://github.com/assistant-ui/assistant-ui/commit/5fdf17e019c91b000c6f4cf9e3e56c89d764a435)]:
  - @assistant-ui/core@0.1.18
  - assistant-stream@0.3.13
  - @assistant-ui/store@0.2.10

## 0.0.4

### Patch Changes

- [#3885](https://github.com/assistant-ui/assistant-ui/pull/3885) [`eddd892`](https://github.com/assistant-ui/assistant-ui/commit/eddd8927404cbe05470979cfa6d4b5f87c270daa) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`549037a`](https://github.com/assistant-ui/assistant-ui/commit/549037ac77aed8736823cfb82baf9645e3364adf), [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e), [`976aec5`](https://github.com/assistant-ui/assistant-ui/commit/976aec566330bee3c607cfb356f3358eefe28ac1), [`25b97d5`](https://github.com/assistant-ui/assistant-ui/commit/25b97d5c62fb038471b06eaa784ad4b7e23ef533), [`2008fc9`](https://github.com/assistant-ui/assistant-ui/commit/2008fc9af3d6fe05604d6b08275c2e9cec099bd9), [`88fcd35`](https://github.com/assistant-ui/assistant-ui/commit/88fcd352ecffd12f124abe988cc5499f784f81d6)]:
  - @assistant-ui/core@0.1.16
  - @assistant-ui/store@0.2.9

## 0.0.3

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#3866](https://github.com/assistant-ui/assistant-ui/pull/3866) [`ad94dd6`](https://github.com/assistant-ui/assistant-ui/commit/ad94dd64c5c8cbfc0001d1551765f6c34ab899c7) - feat: add `useLangChainState<T>(key)` hook to read arbitrary LangGraph custom state keys (e.g. `todos`, `files`) from the current thread, mirroring upstream `useStream().values[key]`. ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`c7a274e`](https://github.com/assistant-ui/assistant-ui/commit/c7a274e968f8e081ded4c29cc37986392f04130e), [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6), [`ca8f526`](https://github.com/assistant-ui/assistant-ui/commit/ca8f526944968036d47849a7659353765072a836), [`c56f98f`](https://github.com/assistant-ui/assistant-ui/commit/c56f98f5759e710281fc57b343b41af102914f1a), [`974d15e`](https://github.com/assistant-ui/assistant-ui/commit/974d15e34675cc5a611f0297904f5cb2c1b3da8c), [`4b19d42`](https://github.com/assistant-ui/assistant-ui/commit/4b19d42970cb98cee6ea69e2c26dc22763091568), [`da0f598`](https://github.com/assistant-ui/assistant-ui/commit/da0f59818085c7b97d157da1260c5e20873c32c1), [`d53ff4f`](https://github.com/assistant-ui/assistant-ui/commit/d53ff4f3f8b7d7220c1cb274c4fda335598fb063), [`20f8404`](https://github.com/assistant-ui/assistant-ui/commit/20f8404b70098e4b7cbc8df5bbb47985ac81b52c), [`17958c9`](https://github.com/assistant-ui/assistant-ui/commit/17958c9234ccc42394260125df54d897c06a47fd)]:
  - @assistant-ui/core@0.1.15
  - assistant-stream@0.3.12
  - assistant-cloud@0.1.27
  - @assistant-ui/store@0.2.8

## 0.0.2

### Patch Changes

- c988db8: chore: update dependencies
- 0ec6bcf: feat: add react-langchain package with useStreamRuntime hook for @langchain/react integration
- Updated dependencies [f20b9ca]
- Updated dependencies [c988db8]
  - @assistant-ui/core@0.1.14
  - assistant-stream@0.3.11
  - assistant-cloud@0.1.26
  - @assistant-ui/store@0.2.7
