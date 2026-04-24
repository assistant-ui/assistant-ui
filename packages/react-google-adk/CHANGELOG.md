# @assistant-ui/react-google-adk

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
