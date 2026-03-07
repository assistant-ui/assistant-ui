## CONTRIBUTING

A big welcome and thank you for considering contributing to assistant-ui! It’s people like you that make it a reality for users in our community.

You can contribute by opening an issue, or by making a pull request. For large pull requests, we ask that you open an issue first to discuss the changes before submitting a pull request.

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

### Adding a changeset

Every pull request that changes packages must include a changeset, otherwise your changes won't be published to npm.

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
