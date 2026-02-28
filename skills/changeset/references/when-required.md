# When A Changeset Is Required

Use this checklist in PRs:

1. Did you change behavior or API in a published package under `packages/`?
- Yes: add a changeset.
- No: continue.

2. Is the change only docs/examples/internal tooling?
- Yes: usually no changeset needed.

3. Is the change only in private packages/apps?
- Usually no changeset needed.

From this repo's guidance, changesets do not apply to private packages such as:
- `@assistant-ui/docs`
- `@assistant-ui/shadcn-registry`
- `@assistant-ui/x-buildutils`

If uncertain, prefer adding a small `patch` changeset and note assumptions in PR.
