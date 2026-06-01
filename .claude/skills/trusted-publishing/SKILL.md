---
name: trusted-publishing
description: Configure npm trusted publishing (OIDC) and lock down publishing access for a newly added publishable package in the assistant-ui monorepo. Use whenever a new public package is created under packages/* (a new package.json with `"private": false` / a new name on npm), when a release fails with "not configured for npm trusted publishing", or when the user asks to set up OIDC / trusted publishing / disallow tokens for a package.
---

# trusted-publishing

Every public package in this monorepo publishes to npm through **trusted publishing (OIDC)** from the `npm-publish.yaml` GitHub Actions workflow — there are no long-lived npm tokens. Trusted publishing is configured **per package name** on the npm registry. Adding a new package to `packages/*` does **not** automatically grant it OIDC publish rights: until you configure it, the release run will fail that package with `not configured for npm trusted publishing`.

So: whenever you add a new publishable package (or notice one missing its config), set up trusted publishing **and** harden its publishing access before the first release.

## When this applies

A package needs this setup if its `package.json` has `"private": false` (or no `private` field) and ships to npm. The `private` field is the source of truth — skip any package marked `"private": true` (currently `@assistant-ui/ui`, `@assistant-ui/x-changelog`, `@assistant-ui/docs`, `@assistant-ui/shadcn-registry`); they never publish.

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

Requires **npm ≥ 11.10.0** (`npm trust` was added then; the repo's pinned npm is fine — check `npm --version`). Both commands need an **interactive 2FA OTP** and cannot be driven by an automation token, so they can't run unattended. Have the user run them — they can use the `! <command>` prompt prefix so output lands in this session.

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

> **Brand-new package?** `npm access set mfa=publish` (and the website's Publishing-access toggle) only work once the package exists on the registry — for a name that has never published, run step 1 (`npm trust`) now and apply this mfa lockdown right after the first release. Step 1 works pre-publish; see [Brand-new package names](#brand-new-package-names-first-publish-chicken-and-egg) below.

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

The npm **website** only lets you edit a package's settings once the package already exists on the registry — so for a brand-new name, configure with **`npm trust` first** (it can establish the trust relationship without publishing a placeholder version), and then let the `npm Publish` workflow ship the initial version via OIDC. If you hit trouble publishing the very first version through OIDC, the fallback is a one-time manual publish, then configure on the website, then all subsequent releases flow through the workflow. Don't introduce a long-lived `NPM_TOKEN` to work around it.

Lock down publishing access (`npm access set mfa=publish`, or the website's Publishing-access toggle) **after** that first version exists — it can't be set on a name that hasn't published yet.

## Checklist for a new package

1. `package.json` has `"private": false` and the correct public `name`.
2. Run the two `npm trust` / `npm access` commands above (or the website equivalents).
3. `npm trust list <PKG>` shows the GitHub Actions entry; `npm access get status` confirms mfa.
4. Add a `patch` changeset (per `AGENTS.md`) that **names the new package explicitly** in its frontmatter — changesets only releases packages listed in a changeset entry, so a brand-new package won't ship unless it's named. Nothing else in the workflow needs editing.
5. Ship the first version as a **stable semver** (no `-` pre-release suffix like `0.1.0-alpha.0`). `npm-publish.yaml` calls `setFailed` on prerelease versions and fails the **entire** release run, not just that package.
