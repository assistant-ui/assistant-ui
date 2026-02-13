# Format Consistency Test Task (TDD)

Create tests that ensure format handling stays consistent between:
- `packages/cloud-ai-sdk/src/chat/MessagePersistence.ts`
- `packages/react-ai-sdk/src/ui/adapters/aiSDKFormatAdapter.ts`

## Goal

Protect against drift in `ai-sdk/v6` persistence behavior across both packages.

## Scope (Behavior, Not Internals)

Test through each package's public behavior:
1. Both adapters use the same format contract value (`"ai-sdk/v6"`).
2. Encode behavior remains equivalent for persisted message content.
3. Decode behavior remains equivalent for loaded cloud rows (`id`, `parent_id`, `content`).
4. ID extraction behavior remains equivalent.

Do not test private helpers directly unless they are the only public path.

## TDD Plan (Red-Green-Refactor)

### 1) Planning checkpoint

- [ ] Confirm final test location(s) with maintainers.
- [ ] Confirm whether consistency should be strict parity or documented intentional differences.
- [ ] Confirm which message shapes are critical (minimum: user, assistant, tool/data-bearing messages).

### 2) Tracer bullet (first vertical slice)

- RED: Add one failing test that asserts both adapters expose the same format value.
- GREEN: Make minimum change needed for pass.

### 3) Incremental vertical slices

Add one failing test at a time, then make it pass:
- RED/GREEN: encode parity for a representative `UIMessage`.
- RED/GREEN: decode parity for a representative stored row.
- RED/GREEN: `getId` parity.
- RED/GREEN: parity for one edge case payload (e.g. metadata + nested part data).

### 4) Refactor

- [ ] Remove duplication in test fixtures/builders.
- [ ] Keep assertions focused on externally observable adapter behavior.
- [ ] Run tests after each refactor.

## Suggested Test Structure

- Add a dedicated contract test file in each package _or_ one cross-package contract suite under a shared test location.
- Preferred assertion style: same input -> equivalent outputs from both adapters.
- Use stable fixture builders so new cases can be added quickly.

## Acceptance Criteria

- A failing test appears if either package changes format behavior independently.
- Tests pass when both adapters remain aligned.
- Test names clearly describe behavior (not implementation details).
- CI command to run is documented in the PR description.

## Commands

```bash
pnpm build
pnpm --filter @assistant-ui/cloud-ai-sdk test
pnpm --filter @assistant-ui/react-ai-sdk test
```

