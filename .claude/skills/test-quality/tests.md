# Meaningful assistant-ui tests

A test earns its place by catching a realistic failure of supported behavior. Name that behavior in the test title. Test count and coverage percentage do not establish that the important assertion would fail.

Follow the root [test conventions](../../../AGENTS.md#tests) for placement and imports. [x-buildutils tests](../../../packages/x-buildutils/AGENTS.md#rules) use `node:test` with relative `.ts` imports. [Cross-package performance contracts](../../../packages/x-performance/README.md#disciplines-and-ci-tiers) live in `packages/x-performance/contracts/` and import measured packages through public entries against built dists; colocated tests of package internals still use relative imports. Consult [mocking.md](mocking.md) when choosing test doubles.

## Choose the owning boundary

| Change | Boundary and behavior to exercise |
| --- | --- |
| Provider conversion | Call the real converter with representative provider payloads and check independently specified message content, status, IDs, or metadata. Cover both supported directions. |
| Reducer or controller | Drive real transitions and inspect resulting state or emitted actions, including the relevant failure or recovery path. |
| Runtime lifecycle | Drive append, cancel, switch, retry, or dispose through the existing runtime interface and observe state, subscriptions, or the adapter operation that forms the contract. |
| Accessor hook | Render the hook with its real provider, update its source, and verify the value or action exposed to the caller. |
| UI primitive | Interact through keyboard or pointer input and check focus, accessible state, or rendered behavior. Use a real browser when the claim depends on layout or scrolling. |
| Stream or persistence format | Decode representative external or stored data and check the resulting messages. Verify emitted data against the required format. |
| Performance | Drive real updates and measure the render, commit, notification, or conversion contract with the existing performance helpers. |
| Package compatibility | Exercise the supported package entry, types, or built artifact in the relevant consumer environment. |

Tests of pure modules can stay small. A hook or wiring bug needs coverage through the affected hook or integration, even if its helper already has unit tests. Use the owning package's established harness and the root guide's placement and import rules.

## Assertions that provide evidence

- Derive expected values from the supported contract, a checked example, or an independent fixture. Reusing the production converter, normalizer, or copied algorithm to construct the expectation can reproduce its bug. A round trip can also hide matching encoder and decoder mistakes; add an independent expected representation when format compatibility is the claim.
- Assert outcomes beyond existence or truthiness when their content matters. Check the retained draft, selected thread, tool result, or failure status that establishes correctness.
- Cover one coherent scenario per test. Several assertions may be needed to establish it, such as preserving the selected thread and removing a deleted item.
- Add input variants for distinct branches or contracts. Avoid multiplying cases whose inputs exercise the same mechanism without exposing another risk.
- Cover malformed provider payloads when the integration encounters them or promises to handle them. Do not invent impossible internal states merely to increase coverage.

## Race and cleanup examples

For a stale thread-load bug: start the load, establish that it is pending, select a different thread, complete the old load, and assert that the selected thread and its messages remain correct. Checking a setter call alone misses a later overwrite.

For a cancellation rollback bug: start the affected operation, add a newer draft, cancel, settle the outstanding completion or rejection, then assert that the newer draft survives. An assertion made before the late work settles can pass while the bug remains.

For disposal: dispose the real runtime or unmount the hook, deliver the relevant late event, and verify that it cannot update the disposed state or notify its subscribers. A cleanup spy is sufficient only when invoking that collaborator is itself the contract under test.

Control asynchronous work with deferred promises, explicit events, or fake timers when time is the input. Use the harness's React or tap flushing helpers to settle updates. Avoid arbitrary sleeps and do not swallow a rejected promise to make the test finish.

## Reject weak evidence, preserve real contracts

| Weak evidence | Useful replacement |
| --- | --- |
| Reading a runtime source file to find an abort check | Cancel through the real runtime and verify the relevant late result is ignored. |
| Adding a CSS class, then asserting that same class exists | Verify the intended visibility, interaction, or browser layout. |
| Replacing the converter with a mock, then asserting its configured return value | Execute the converter with concrete provider data. |
| Checking that a newly added private helper was called | Assert the caller-visible result of the operation. |
| Pinning the current value of an incidental constant | Exercise the supported behavior affected by that value. |

Exact values are appropriate when they are the contract. Retry limits, duplicate-request prevention, subscription ordering, stable identities used by consumers, published exports, and persisted protocol identifiers can all need precise assertions. An adapter callback receiving the correct arguments is meaningful when that callback is the integration boundary. Keep the exact performance counters required by [x-performance](../../../packages/x-performance/README.md).

Reading source or configuration is appropriate when the product being tested is a parser, generator, linter, or repository policy checker. Feed it representative fixtures and assert its output or diagnostics. Searching a production file for the text of the fix does not prove runtime behavior.

If existing coverage already protects the change, report that coverage. If an automated test would only repeat the implementation or cannot reliably exercise the failure, provide a concrete reproduction, verification, and the limitation. Inconvenient setup alone is not a reason to omit useful coverage. Do not add filler tests or lower existing expectations just to obtain a passing result.

## Existing examples

- [LangChain conversion](../../../packages/react-langchain/src/convertMessages.test.ts) checks actual conversions against concrete expected content in both directions.
- [Thread switch/delete ordering](../../../packages/core/src/react/runtimes/RemoteThreadListThreadListRuntimeCore.switch-delete.test.ts) controls pending adapter work and checks the resulting selection and thread list.
- [Transport interoperability](../../../packages/assistant-stream/src/core/serialization/assistant-transport/AssistantTransport.interop.test.ts) decodes a fixture produced by the Python encoder.
- [Store notification granularity](../../../packages/x-performance/contracts/store-notifications.test.tsx) measures real subscriber updates and deliberately pins their counts.
