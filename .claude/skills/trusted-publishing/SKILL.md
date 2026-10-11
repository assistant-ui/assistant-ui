---
name: trusted-publishing
description: Configure npm trusted publishing (OIDC) and lock down publishing access for a newly added publishable package in the assistant-ui monorepo. Use whenever a new public package is created under packages/* (a new package.json with `"private": false` / a new name on npm), when a release fails a package with an npm trusted-publishing / OIDC authorization error, or when the user asks to set up OIDC / trusted publishing / disallow tokens for a package.
---

# trusted-publishing

Every public package in this monorepo publishes to npm through **trusted publishing (OIDC)** from the `npm-publish.yaml` GitHub Actions workflow — there are no long-lived npm tokens. Trusted publishing is configured **per package name** on the npm registry. Adding a new package to `packages/*` does **not** automatically grant it OIDC publish rights: until you configure it, the release run fails that package's publish with an OIDC authorization error from npm.

So: whenever you add a new publishable package (or notice one missing its config), set up trusted publishing **and** harden its publishing access before the first release.

## When this applies

The release workflow only scans `packages/*` and publishes each package there whose `package.json` is not `"private": true`. So a new package under `packages/` needs this setup unless you mark it `"private": true` (as `@assistant-ui/ui` and `@assistant-ui/x-changelog` are). Anything outside `packages/` is never published regardless — e.g. `@assistant-ui/docs` and `@assistant-ui/shadcn-registry` live under `apps/`, so they're excluded by location.

## The config values (identical for every package in this repo)

| Field | Value |
|---|---|
| Publisher | GitHub Actions |
| Organization or user | `assistant-ui` |
| Repository | `assistant-ui` |
| Workflow filename | `npm-publish.yaml` |
| Environment name | `npm Publish` |
| Allowed actions | ✅ Allow `npm publish` **and** ✅ Allow `npm stage publish` |

These match the publish job in `.github/workflows/npm-publish.yaml`, which already runs in the `npm Publish` environment with `id-token: write`. No workflow change is needed per package — only the npm-side config below.

## Do it via CLI (preferred)

Requires **npm ≥ 11.10.0** (`npm trust` was added then; the repo's pinned npm is fine — check `npm --version`). Both commands need an **interactive 2FA OTP** and cannot be driven by an automation token, so they can't run unattended. A token in `~/.npmrc` that bypasses 2FA makes `npm trust` fail with `E401 ... You must be logged in`; sign in with `npm login --auth-type=web` first. Have the user run them — they can use the `! <command>` prompt prefix so output lands in this session.

Replace `<PKG>` with the published name (e.g. `@assistant-ui/react`, or an unscoped name like `assistant-stream`).

```bash
# 1. Create the trusted-publisher relationship (OIDC)
npm trust github <PKG> \
  --repository assistant-ui/assistant-ui \
  --file npm-publish.yaml \
  --environment "npm Publish" \
  --allow-publish \
  --allow-stage-publish

# 2. Lock publishing access: require 2FA, disallow tokens (the "recommended" option)
npm access set mfa=publish <PKG>
```

`mfa=publish` is npm's "**Require two-factor authentication and disallow tokens (recommended)**" setting — it forbids token-based publishes while leaving OIDC trusted publishing working. (`mfa=automation` is the weaker "allow tokens with bypass 2FA" option; don't use it.)

> **Brand-new package?** Both commands answer `E404` for a name that has never published, `npm trust` included. Publish the first version by hand, then run them; see [Brand-new package names](#brand-new-package-names-first-publish-chicken-and-egg) below.

Verify afterward:

```bash
npm trust list <PKG>      # shows the GitHub Actions trust entry
npm access get status <PKG>   # only works post-first-publish; skip for a brand-new name
```

## Or via the website

If the CLI path is blocked (older npm, auth issues), configure both in the npm UI:

- **Trusted publishing:** npmjs.com → Packages → `<PKG>` → **Settings → Trusted publishing** → fill in the table above (allowed actions: tick **both** `npm publish` and `npm stage publish`) → Save.
- **Publishing access:** same Settings page → **Publishing access** → select **"Require two-factor authentication and disallow tokens (recommended)"**.

## Brand-new package names (first-publish chicken-and-egg)

npm keeps trust and publishing-access settings on the package, so a name that has never published has nowhere to store them: `npm trust github` and `npm access set mfa=publish` both fail with `E404`. The first version goes out by hand from a maintainer's machine, and every later release flows through the workflow. Don't introduce a long-lived `NPM_TOKEN` to work around it.

1. Sign in interactively: `npm login --auth-type=web`.
2. From a clean checkout of `main`, build the package and publish it once. Provenance can only be generated in CI, so turn it off for this one publish:

   ```bash
   pnpm turbo build --filter=<PKG>
   cd packages/<dir>
   NPM_CONFIG_PROVENANCE=false pnpm publish --no-git-checks
   ```

   `pnpm publish` rewrites `workspace:` ranges; a plain `npm publish` of the folder would ship them verbatim. Approve the browser 2FA prompt it prints.
3. Run the `npm trust` command above, then `npm access set mfa=publish <PKG>`.
4. Merge the release pull request; the workflow publishes the next version through OIDC.

## Checklist for a new package

1. `package.json` has `"private": false` and the correct public `name`.
2. For a brand-new name, publish the first version by hand (see above); then run the two `npm trust` / `npm access` commands (or the website equivalents).
3. `npm trust list <PKG>` shows the GitHub Actions entry; `npm access get status` confirms mfa.
4. Add a `patch` changeset (per `AGENTS.md`) that **names the new package explicitly** in its frontmatter — changesets only releases packages listed in a changeset entry, so a brand-new package won't ship unless it's named. Nothing else in the workflow needs editing.
5. Ship the first version as a **stable semver** (no `-` pre-release suffix like `0.1.0-alpha.0`). `npm-publish.yaml` calls `setFailed` on prerelease versions and fails the **entire** release run, not just that package.
