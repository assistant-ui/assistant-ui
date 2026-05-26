---
name: update-deps
description: Update dependencies across the assistant-ui monorepo (npm via pnpm + taze, Expo SDK-pinned packages, Python packages via uv, and GitHub Actions). Use when the user asks to bump, upgrade, or update dependencies (root, packages, examples, templates, python/*, .github/workflows/*), refresh the pnpm lockfile or uv.lock files, repin GitHub Actions, or run the dependency-update workflow before a release.
---

# update-deps

Update every package's dependencies across the monorepo (packages, apps, examples, templates, `python/*`, and `.github/workflows/*`), regenerate lockfiles, and create a `chore: update dependencies` changeset for the JS side.

## JS / TS (pnpm workspaces)

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
2. `cd examples/with-expo && npx expo install --fix` — **required**: taze does not know about Expo's SDK compatibility matrix and will bump `expo-*` / `react-native-*` / `react` / `react-dom` to versions that crash at runtime. `expo install --fix` re-pins them to the versions sanctioned by the current `expo` SDK. Do not skip this step, and do not commit Expo-related bumps without it.
3. Wipe every `node_modules` and `pnpm-lock.yaml`, then `pnpm install` + `pnpm dedupe`.
4. `bash scripts/generate-deps-changeset.sh` — write a patch changeset for each published package whose `package.json` changed.

### Expo notes

- If you bump the `expo` major in `examples/with-expo` (e.g. SDK 55 → 56), `expo install --fix` will rewrite the matching `react`, `react-dom`, `react-native`, `react-native-*`, and `expo-*` versions. Eyeball the diff in `examples/with-expo/package.json` to confirm everything snapped to the expected SDK line.
- If you intentionally want to hold Expo back, run `pnpm deps:update`, then `git checkout examples/with-expo/package.json` and re-run `pnpm install` + the changeset script manually.

### Workflow

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

### Notes

- Do **not** hand-edit the generated changeset's bump levels — `generate-deps-changeset.sh` correctly emits `patch` for every published package whose `package.json` changed and skips private packages (`@assistant-ui/docs`, `@assistant-ui/shadcn-registry`, etc.). Per `AGENTS.md`, dependency updates are always patch.
- The script detects changes via `git diff HEAD`, so run it with the package.json edits still unstaged (or staged — it checks both). Don't commit before it runs.
- `pnpm-lock.yaml` will have a huge diff; that's expected since step 3 deletes it.
- Node `>=24` and `pnpm@11.3.0` are required (see root `package.json` `engines` / `packageManager`).

## Python (uv)

Python packages live under `python/` and each has its own `pyproject.toml` + `uv.lock`. They are **not** touched by `pnpm deps:update`.

Packages:

- `python/assistant-stream`
- `python/assistant-ui-sync-server-api`
- `python/assistant-transport-backend`
- `python/assistant-transport-backend-langgraph`
- `python/state-test`
- `python/assistant-stream-hello-world` (no lockfile — example)

For each package with a `uv.lock`, upgrade with:

```bash
cd python/<package>
uv lock --upgrade
uv sync
uv run pytest        # if tests exist
```

Or in one pass from the repo root:

```bash
for d in python/*/uv.lock; do
  (cd "$(dirname "$d")" && uv lock --upgrade && uv sync)
done
```

Notes:

- Python bumps do **not** require a changeset — Python packages are versioned manually in their `pyproject.toml` and published via `.github/workflows/pypi-publish.yaml`, independent of the JS changesets pipeline.
- Bumping a published Python package's own version (e.g. `assistant-stream`) is a separate release decision; `uv lock --upgrade` only touches transitive deps.
- Commit Python and JS dep updates separately if the diff is large, or as one `chore: update dependencies` commit if both are clean.

## GitHub Actions

Workflows under `.github/workflows/*.{yml,yaml}` use a mix of styles:

- **SHA-pinned** (preferred for security — supply-chain hardening):
  `uses: actions/checkout@de0fac2e4500dabe0009e67214ff5f5447ce83dd # v6`
- **Tag-pinned** (still in some files):
  `uses: actions/checkout@v6`

There is **no Dependabot config** (`.github/dependabot.yml` does not exist), so these don't update themselves. `pnpm deps:update` does not touch them either.

To refresh both styles in one shot, use [`ratchet`](https://github.com/sethvargo/ratchet) (or `pinact`):

```bash
# pin any remaining tag refs to SHAs (one-time per file)
ratchet pin .github/workflows/*.yml .github/workflows/*.yaml

# bump every SHA-pinned action to the latest release SHA for its major
ratchet update .github/workflows/*.yml .github/workflows/*.yaml
```

Both leave the `# v6`-style comment intact so reviewers can read the human version. If `ratchet` isn't available, fall back to manually checking each `uses:` against the action's releases page and updating the SHA + comment together.

After updating, sanity-check on a branch by pushing and watching the affected workflows actually run (most are PR-triggered: `code-quality`, `autofix`, `changeset`, `changeset-semver-check`, `expo`, `devtools-frame`, `registry`). Release workflows (`npm-publish`, `pypi-publish`, `traction`) can't be tested without a release tag — eyeball those diffs extra carefully.

Notes:

- GH Actions updates do not need a changeset (they don't ship in any npm package).
- Commit as `chore: update github actions` (or roll into `chore: update dependencies` if landing alongside the JS/Python bumps).
- If a major bump changes inputs/outputs, check the action's release notes — `ratchet` will happily move you from `v4` to `v6` without warning about breaking changes.
