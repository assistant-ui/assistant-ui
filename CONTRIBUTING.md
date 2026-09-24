## CONTRIBUTING

A big welcome and thank you for considering contributing to assistant-ui! It’s people like you that make it a reality for users in our community.

You can contribute by opening an issue, or by making a pull request. [Opening a pull request](#opening-a-pull-request) says when to open an issue first.

Project conventions live in [`AGENTS.md`](./AGENTS.md) and in the `AGENTS.md` of the directory you change, such as [`packages/AGENTS.md`](./packages/AGENTS.md) for package code and runtime adapters; please read and follow them.

### Setting up your environment

You need to have Node.js installed on your computer. We develop with the latest LTS version of Node.js.

Install the dependencies:

```sh
pnpm install
```

Make an initial build:

```sh
pnpm turbo build
```

(some packages rely on build outputs from other packages, even if you want to start the project in development mode)

### Running the project

To run the docs project in development mode:

```sh
cd apps/docs
pnpm dev
```

To run the examples project in development mode:

```sh
cd examples/<your-example>
pnpm dev
```

### Opening a pull request

Open an issue before a non-trivial feature pull request, so a maintainer can confirm the direction is wanted before you invest in code. Trivial fixes, such as a typo or a small docs change, need no issue.

- Keep one concern per pull request, so each one can be reviewed, approved, and reverted on its own.
- Attach a minimal reproduction to every bug report and fix: a repository, a sandbox, or a snippet on the exact version. An issue or pull request whose behavior a maintainer cannot reproduce is closed.
- Do not add an example app that duplicates one in `examples/`. A new example belongs in a repository of your own unless a maintainer asked for it here.
- Title the pull request `<type>(<scope>): <observable outcome>`, for example `fix(react): preserve message status when switching threads` or `feat: expose runtime metadata mutation`. Omit the scope when no package or surface name improves the title, and put trade-offs and divergences in the body.
- Write the description yourself, before any automated summary, so a reviewer can judge the change without reverse-engineering the diff; a bot-generated summary or badge is not a description. Use this shape and omit the sections that do not apply:

```md
## Problem

Describe the user-visible failure or missing capability. Bug fixes include the minimal reproduction and affected version.

## Root cause

Explain the mechanism that produced the behavior.

## Change

Explain the implementation, why it follows the existing architecture, and any intentional runtime or provider differences.

## Verification

List exact focused tests and checks. For a bug, confirm the reproduction fails without the fix and passes with it.

## Public surface

List affected packages, exports, documentation, API-reference output, templates, and changesets, or state `None`.
```

Maintainers add the `preview` label to a ready pull request to publish installable package previews through pkg.pr.new. Every later push updates them while the label stays, and a draft publishes nothing until it is marked ready.

### Adding a changeset

Every pull request that changes packages must include a changeset, otherwise your changes won't be published to npm. CI enforces this: the Changeset Semver Check fails a pull request that edits a published package's shipped files without a changeset naming that package. Tests and top-level Markdown files do not count, comment-only source edits do, and a `package.json` edit counts when it changes what consumers install. Bumping `version`, editing `devDependencies` or a `scripts` entry nobody installing your package runs, and moving the range (not the name) of a dependency on another workspace package are all handled by the release itself, so they need nothing from you; every other field needs a changeset naming that package, `exports`, `files`, `bin`, `sideEffects`, `engines`, `publishConfig`, `peerDependenciesMeta`, an install hook and a third-party range among them.

Note, this does not apply to packages like `@assistant-ui/docs` or `@assistant-ui/shadcn-registry` which are not published to npm, they are deployed on Vercel.

Create a changeset by running:

```sh
pnpm changeset
```

This will detect which packages changed and prompt you to select type (major, minor, patch) and a description of your changes.

#### Which type to pick

**Almost always `patch`** — even for new features and new exports. Here's why:

Most assistant-ui packages are at `0.x` versions (e.g. `0.12.15`). In semver, the caret range `^` behaves differently for `0.x` than for `1.x+`:

| Range | Allows | Example |
|-------|--------|---------|
| `^1.3.12` | any minor or patch (`>=1.3.12 <2.0.0`) | `1.4.0` is fine |
| `^0.12.15` | only patches (`>=0.12.15 <0.13.0`) | `0.13.0` is **out of range** |

This means a **minor bump on a `0.x` package breaks every dependent's caret range**, causing changesets to cascade patch bumps across the entire dependency graph. That creates version churn and noisy changelogs for no real benefit.

**The rules:**

- **patch**: Use for all changes — bug fixes, new features, refactors, new exports
- **minor**: Only when a maintainer explicitly requests it (causes cascading patch bumps across all dependent packages)
- **major**: Only for planned stable releases (`1.0`, `2.0`) — never without maintainer approval

If you forget to add a changeset before merging, create a new PR and run `pnpm changeset` locally to create a changeset. You'll be prompted to manually select the packages that were changed, set update type, and add description. Commit the changeset file, push the changes, and merge the PR.

You can also add changesets on open PRs directly from GitHub using the changeset bot's link in PR comments.

### Releasing

Our CI checks for changesets in `.changeset/` on `main` and will create an "update versions" PR which versions the packages, updates the changelog, and publishes the packages to npm on merge.
