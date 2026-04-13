# @assistant-ui/react-google-adk

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
