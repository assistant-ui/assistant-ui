---
name: update-deps
description: Update npm dependencies across the assistant-ui monorepo. Use when the user asks to bump, upgrade, or update dependencies (root, packages, examples, templates), refresh the pnpm lockfile, or run the dependency-update workflow before a release.
---

# update-deps

Update every package's dependencies across the monorepo (packages, apps, examples, templates) using `taze`, regenerate the lockfile, and create a `chore: update dependencies` changeset.

## Commands

Preview what would change without writing anything:

```bash
pnpm deps:check
```

Run the full update (writes package.json files, reinstalls, dedupes, generates the changeset):

```bash
pnpm deps:update
```

Both are defined in the root `package.json`. `deps:update` performs, in order:

1. `npx taze major -f -w -r` — bump every dependency (incl. major) recursively.
2. `cd examples/with-expo && npx expo install --fix` — let Expo pin SDK-compatible versions.
3. Wipe every `node_modules` and `pnpm-lock.yaml`, then `pnpm install` + `pnpm dedupe`.
4. `bash scripts/generate-deps-changeset.sh` — write a patch changeset for each published package whose `package.json` changed.

## Workflow

1. From a clean working tree on a feature branch, run `pnpm deps:update`. It takes several minutes (lockfile is regenerated from scratch).
2. `git status` to confirm the changeset file appeared under `.changeset/` and that only `package.json` / `pnpm-lock.yaml` files changed.
3. Validate before committing:
   ```bash
   pnpm build
   pnpm lint
   pnpm test
   ```
4. If a package breaks on a major bump, pin that one dep back in the offending `package.json` and re-run `pnpm install`; the changeset script does **not** need to re-run.
5. Commit as `chore: update dependencies` and push.

## Notes

- Do **not** hand-edit the generated changeset's bump levels — `generate-deps-changeset.sh` correctly emits `patch` for every published package whose `package.json` changed and skips private packages (`@assistant-ui/docs`, `@assistant-ui/shadcn-registry`, etc.). Per `AGENTS.md`, dependency updates are always patch.
- The script detects changes via `git diff HEAD`, so run it with the package.json edits still unstaged (or staged — it checks both). Don't commit before it runs.
- `pnpm-lock.yaml` will have a huge diff; that's expected since step 3 deletes it.
- Node `>=24` and `pnpm@11.3.0` are required (see root `package.json` `engines` / `packageManager`).
