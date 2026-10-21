# Test doubles in assistant-ui

Keep the mechanism responsible for the behavior real. Choose doubles based on the contract under test, rather than whether an import happens to be internal or external.

## Useful boundaries

- Supply a controlled `ChatModelAdapter` or remote thread-list adapter to exercise the real core runtime without a live service.
- Control provider transport responses or events while testing adapter orchestration. Use realistic payloads and drive success, rejection, cancellation, or streaming completion as needed.
- Control clocks and randomness when they are inputs to the behavior. Release deferred responses explicitly for ordering bugs.
- Use temporary storage or a small storage double when persistence is incidental. Exercise actual serialization and reads when persistence or reload behavior is the claim.

Prefer the existing adapter interfaces and test helpers. Do not introduce another controller, runtime core, or production abstraction just to make mocking easier. Follow the root [Vitest mocking conventions](../../../AGENTS.md#tests) when replacing a module.

## Keep the affected integration real

For a converter bug, call the converter itself. For runtime lifecycle bugs, keep the state transitions, subscription machinery, and affected hook real. For provider integration bugs, mock below the SDK behavior implicated in the failure; replacing that behavior with a hand-written approximation can hide the bug.

A double must preserve the relevant behavior of its boundary. An immediately resolved mock cannot expose a pending-load race. A fake subscription that never emits after disposal cannot establish that late events are ignored. A cancellation fake that always rejects immediately may miss a provider that completes later.

Inspect outgoing calls when the external interaction is the contract, such as a thread ID sent to an adapter or an abort signal passed to transport. When the contract concerns resulting runtime state, also assert that state after the operation settles. Do not infer correct cancellation or cleanup solely from a spy being called.

When mocks require duplicating the production state machine or replacing most of the path being tested, move to the existing integration harness and keep more real components. Test setup should arrange the failure, not implement the behavior whose correctness is in question.
