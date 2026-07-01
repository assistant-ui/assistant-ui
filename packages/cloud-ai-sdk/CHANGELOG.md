# @assistant-ui/cloud-ai-sdk

## 0.1.24

### Patch Changes

- [#4608](https://github.com/assistant-ui/assistant-ui/pull/4608) [`a7b06f7`](https://github.com/assistant-ui/assistant-ui/commit/a7b06f76876078fc2fcbb92a86fa0e1530fde782) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies []:
  - assistant-cloud@0.1.34

## 0.1.23

### Patch Changes

- [#4517](https://github.com/assistant-ui/assistant-ui/pull/4517) [`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff) - chore: update dependencies ([@okisdev](https://github.com/okisdev))

- Updated dependencies [[`cefcf27`](https://github.com/assistant-ui/assistant-ui/commit/cefcf27b4b53ceafef18e469644d51797c11c8ff)]:
  - assistant-cloud@0.1.34

## 0.1.22

### Patch Changes

- [#4422](https://github.com/assistant-ui/assistant-ui/pull/4422) [`e100f90`](https://github.com/assistant-ui/assistant-ui/commit/e100f906489f27d5193b6c8be80a6f87c5667850) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.1.21

### Patch Changes

- [#4390](https://github.com/assistant-ui/assistant-ui/pull/4390) [`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`bb38d08`](https://github.com/assistant-ui/assistant-ui/commit/bb38d085b04b59f68c8cf16b23c2211454384668)]:
  - assistant-cloud@0.1.33

## 0.1.20

### Patch Changes

- [#4306](https://github.com/assistant-ui/assistant-ui/pull/4306) [`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`15878d8`](https://github.com/assistant-ui/assistant-ui/commit/15878d8114edbbb82c2a467cf811478e5f4e08bc)]:
  - assistant-cloud@0.1.32

## 0.1.19

### Patch Changes

- [#4198](https://github.com/assistant-ui/assistant-ui/pull/4198) [`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`78ff336`](https://github.com/assistant-ui/assistant-ui/commit/78ff336028ce125608a4b716a93a2519ad6d9eab)]:
  - assistant-cloud@0.1.31

## 0.1.18

### Patch Changes

- [#4175](https://github.com/assistant-ui/assistant-ui/pull/4175) [`2dec3ae`](https://github.com/assistant-ui/assistant-ui/commit/2dec3aeba0431178f4ca26e470b304f5a89390ba) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- [#4128](https://github.com/assistant-ui/assistant-ui/pull/4128) [`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`331f2f7`](https://github.com/assistant-ui/assistant-ui/commit/331f2f7f432285fd0cdc14e0862b550e5d15769e)]:
  - assistant-cloud@0.1.30

## 0.1.17

### Patch Changes

- [#4123](https://github.com/assistant-ui/assistant-ui/pull/4123) [`4b95d4c`](https://github.com/assistant-ui/assistant-ui/commit/4b95d4c9510febbd5175f30884a87afa69f5adf8) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.1.16

### Patch Changes

- [#4085](https://github.com/assistant-ui/assistant-ui/pull/4085) [`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`01244a5`](https://github.com/assistant-ui/assistant-ui/commit/01244a56026ee92bd4e49cb985136f9eb6d45154)]:
  - assistant-cloud@0.1.29

## 0.1.15

### Patch Changes

- Updated dependencies [[`845c7c1`](https://github.com/assistant-ui/assistant-ui/commit/845c7c12fecbb448da7f1135c33163b653a50710)]:
  - assistant-cloud@0.1.28

## 0.1.14

### Patch Changes

- [#3949](https://github.com/assistant-ui/assistant-ui/pull/3949) [`b382de0`](https://github.com/assistant-ui/assistant-ui/commit/b382de018888a154cb45d0a95dbe7ec9adf1a1a7) - fix(cloud-ai-sdk): use ai sdk onFinish event for telemetry status instead of message-shape heuristic ([@okisdev](https://github.com/okisdev))

  `extractRunTelemetry` previously inferred run status by walking message parts and checking for a final text part. when an assistant message ended on an unresolved frontend tool call (e.g. `ask_user_questions`), the model's turn was reported as `status: "incomplete"` with empty `output_text`, and the per-`assistantMessageId` dedupe in `CloudTelemetryReporter` then locked that record so the later resubmission carrying the actual text never overwrote it.

  `CloudChatCore` now forwards the ai sdk `onFinish` event (`finishReason`, `isAbort`, `isDisconnect`, `isError`) into `CloudTelemetryReporter.reportFromMessages`. status is derived from those signals; `length` / `content-filter` map to `incomplete`, `isError` / `finishReason: "error"` map to `error`, `stop` and terminal `tool-calls` map to `completed`. mid-loop checkpoints (`finishReason: "tool-calls"` with `lastAssistantMessageIsCompleteWithToolCalls` returning true) are skipped, so the dedupe slot stays open for the post-resubmit final state.

  `extractRunTelemetry` now uses ai sdk's `isToolUIPart`, `isStaticToolUIPart`, `isReasoningUIPart`, and `getToolName` helpers in place of hand-rolled equivalents, and exposes a `hasReasoning` flag. `reportFromMessages`'s third `event` argument is optional, so existing callers that only pass `(threadId, messages)` keep their previous behavior.

- [#3962](https://github.com/assistant-ui/assistant-ui/pull/3962) [`b090acb`](https://github.com/assistant-ui/assistant-ui/commit/b090acb98f6bf3579aab4efedddaff83a0b54c94) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies []:
  - assistant-cloud@0.1.27

## 0.1.13

### Patch Changes

- [#3909](https://github.com/assistant-ui/assistant-ui/pull/3909) [`005f83f`](https://github.com/assistant-ui/assistant-ui/commit/005f83f3ebfb94b3a9d7c34bc7d2a71bbaf63a9e) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

## 0.1.12

### Patch Changes

- [#3876](https://github.com/assistant-ui/assistant-ui/pull/3876) [`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6) - chore: update dependencies ([@Yonom](https://github.com/Yonom))

- Updated dependencies [[`ce865bc`](https://github.com/assistant-ui/assistant-ui/commit/ce865bc46af996d53f89e18068139d4d38546ca6)]:
  - assistant-cloud@0.1.27

## 0.1.11

### Patch Changes

- c988db8: chore: update dependencies
- Updated dependencies [c988db8]
  - assistant-cloud@0.1.26

## 0.1.10

### Patch Changes

- 376bb00: chore: update dependencies
- Updated dependencies [376bb00]
  - assistant-cloud@0.1.25

## 0.1.9

### Patch Changes

- bdce66f: chore: update dependencies
- 209ae81: chore: remove aui-source export condition from package.json exports
- Updated dependencies [bdce66f]
- Updated dependencies [209ae81]
  - assistant-cloud@0.1.24

## 0.1.8

### Patch Changes

- 52403c3: chore: update dependencies
- Updated dependencies [52403c3]
  - assistant-cloud@0.1.23

## 0.1.7

### Patch Changes

- 736344c: chore: update dependencies
- c71cb58: chore: update dependencies

## 0.1.6

### Patch Changes

- 349f3c7: chore: update deps
- Updated dependencies [349f3c7]
  - assistant-cloud@0.1.22

## 0.1.5

### Patch Changes

- 57e26d2: chore: update dependencies

## 0.1.4

### Patch Changes

- a845911: chore: update dependencies
- Updated dependencies [a845911]
  - assistant-cloud@0.1.21

## 0.1.3

### Patch Changes

- 17cf9a8: feat(telemetry): add reasoning/cached token usage across cloud reporting paths
- Updated dependencies [17cf9a8]
  - assistant-cloud@0.1.20

## 0.1.2

### Patch Changes

- 36ef3a2: chore: update dependencies
- 3a39d33: feat(cloud-ai-sdk): add telemetry reporting for chat runs
- Updated dependencies [36ef3a2]
  - assistant-cloud@0.1.19

## 0.1.1

### Patch Changes

- 93910bd: Rename .tsx files to .ts where no JSX syntax is used
- Updated dependencies [d08a488]
- Updated dependencies [5e304ea]
- Updated dependencies [af5b085]
- Updated dependencies [a247fc9]
- Updated dependencies [93910bd]
- Updated dependencies [58a8472]
  - assistant-cloud@0.1.18
