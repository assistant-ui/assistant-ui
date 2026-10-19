---
name: test-quality
description: Design and review meaningful tests for assistant-ui bug fixes, behavior changes, and pull requests that add, change, or remove tests. Use to choose test boundaries, prove regressions, and assess mocks and assertions. Editorial-only changes do not require new tests.
---

# assistant-ui test quality

Keep tests that protect supported assistant-ui behavior. Read [tests.md](tests.md) when applying this skill; read [mocking.md](mocking.md) when choosing or reviewing test doubles. Contributors can use these references directly.

Follow the repository's [testing conventions](../../../AGENTS.md#tests), [adapter architecture](../../../packages/AGENTS.md#adapters), and [performance contracts](../../../packages/x-performance/README.md). This skill adds criteria for deciding what a test should prove.

## Choose the behavior and boundary

Identify the supported behavior and a realistic regression the test should catch. Read the owning implementation and nearby tests before adding coverage. Extend an existing case when it already exercises the relevant behavior; add a case when the failure mode or boundary differs.

Use the smallest existing interface that exercises the mechanism: a pure converter or reducer, a runtime action and observable state, an accessor hook, or a rendered primitive. A module interface is sufficient for focused tests; do not add public exports, test-only methods, or a new runtime abstraction solely to reach private state. Follow the existing architecture without requesting approval for routine test choices. Clarify only an unresolved product contract that affects the implementation.

## Prove the regression and fix

Work through one behavior at a time. For a bug, run the focused test against the unfixed behavior and confirm that its assertion fails for the reported reason. A missing import, broken fixture, or unrelated timeout is not regression evidence. Apply the smallest fix and rerun the test and relevant checks. If implementation already exists, verify against the base revision or an isolated copy with the fix removed, preserving unrelated work.

Use the existing package test runner and relevant type checks. Include cross-runtime coverage when shared behavior or adapter parity is affected, following the [adapter rules](../../../packages/AGENTS.md#adapters). Keep lasting coverage in the owning suite; fold useful temporary reproductions into it.

## Review before the PR

Assess added, changed, and removed tests against the production diff:

- Which supported behavior does each case protect, and would reverting the fix or removing the relevant guard make it fail?
- Does the assertion observe the real mechanism with an independently specified expectation?
- Would an internal refactor that preserves the contract require rewriting the assertion?
- Do changed expectations or deletions remove protection for behavior that remains supported?

Preserve deliberate call-count, ordering, identity, export, and wire-format contracts. Flag concrete missing coverage or weak assertions within the change; do not turn a focused PR into a cleanup of the whole suite.

In the PR's existing Verification section, name the protected behavior, exact checks and results, and the failing-before/passing-after evidence for a bug. Report any verification limitation instead of implying that a passing suite proves an untested path.

The structure draws on [Matt Pocock's TDD skill](https://github.com/mattpocock/skills/blob/main/skills/engineering/tdd/SKILL.md), adapted to assistant-ui's runtime, adapter, and contributor contracts.
