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
- Title the pull request `<type>(<scope>): <observable outcome>`, for example `fix(react): preserve message status when switching threads` or `feat: expose runtime metadata mutation`. Omit the scope when no package or surface name improves the title, and put trade-offs and divergences in the body. The type is one of `fix`, `feat`, `docs`, `test`, `perf`, `refactor`, `chore`, `ci`, `build` or `revert`.
- Write the description yourself in the sections of `.github/pull_request_template.md`, before any automated summary, so a reviewer can judge the change without reverse-engineering the diff; a bot-generated summary or badge is not a description. Omit the sections that do not apply, and keep long analysis in the linked issue.

Maintainers add the `preview` label to a ready pull request to publish installable package previews through pkg.pr.new. Every later push updates them while the label stays, and a draft publishes nothing until it is marked ready.

### Review policy

Every pull request gets a tier from T0 to T3, and the `review-tier` check reports the tier, the reasons for it, and what the merge still needs. `.github/review-policy.json` holds the areas, their owner teams and the thresholds; `.github/CODEOWNERS` and the branch rulesets are generated from it by `scripts/sync-review-policy.mjs`.

| Tier | Triggered by | Needs before merge |
| --- | --- | --- |
| T0 | Only `apps/`, `examples/`, `templates/`, Markdown outside contract areas, changeset text, or new tests outside contract areas | Nothing more when a maintainer authored it; otherwise 1 approval from a maintainer or a member of the `reviewers` team |
| T1 | Package code outside contract areas that changes no public API or documented behavior | 1 approval from a maintainer or a member of the `reviewers` team; 2, including a maintainer, when the author is neither |
| T2 | A contract area (`packages/tap`, `packages/store`, `packages/assistant-stream`, `api-surface/`, `.github/`, the policy scripts, the tap and store docs), added or changed public exports, a changed `exports` map or manifest contract field, or a new `@deprecated` | 2 maintainer approvals, at least 1 from an owner of each affected area, and 24 hours open after ready for review |
| T3 | A `behavior-change` label, a removed or renamed export or entry point, a new package or subpath, a new runtime, peer or optional dependency or an upstream major, a `refactor` that spans two or more packages, workflow permissions, secrets or privileged triggers, release workflows, or this policy (`.github/review-policy.json` and the scripts and workflows that enforce it) | T2's approvals, a linked issue labeled `decision: accepted` by an owner of the affected area (by a maintainer when no contract area is affected), and 72 hours open after ready for review |

- Approvals count only on the current head, so every push, autofix commits included, needs fresh approvals. They never count from the author or from anyone who authored or committed a commit in the pull request; committing a review suggestion or updating the branch from the web makes you one.
- Every review thread is resolved before merge, every check passes (the rulesets require `autofix`, `Build Changed Packages`, `Typecheck Changed Packages` and `Review Policy Scripts`), and the `review-tier` comment lists nothing still needed.
- Size never lowers a tier. A T2 or T3 pull request that changes more than 400 lines outside tests, generated files and the T0 paths lands as a stack of smaller pull requests.
- The title type is a claim reviewers hold the pull request to: `fix` carries a regression test, `feat` links an issue where a maintainer confirmed the direction, and `perf` attaches x-performance numbers. The check verifies `refactor`: it fails a refactor that changes `api-surface/`, an `exports` map or an existing test assertion.
- An owner of the affected area may add `review-tier/override: size`, `review-tier/override: type` or `review-tier/override: window`, with a comment giving the reason. An override waives that one signal until the label is removed and never lowers the approvals a tier needs.
- Only organization owners can bypass the rulesets, and only for their own pull requests. The weekly review health issue lists every bypass and override.
- Any maintainer may open a revert, without discussion, of a pull request merged within 7 days that broke `main`, skipped this policy, or drew an owner's objection. The revert is reviewed at its own tier.
- Pull requests merge through the merge queue with auto-merge, which tests the merged result before it lands.
- Maintainers aim to give outside pull requests a first response within 2 business days.

#### AI-assisted contributions

- State in the pull request which tools wrote or changed code and how you verified the result. You must be able to explain every line; a pull request its author cannot explain is closed without review.
- Bots open draft pull requests only. A maintainer who adopts a bot draft becomes its accountable author.
- Contributors without write access can have 3 open non-draft pull requests at a time, and contributors with write access who are not maintainers 5. While an author is over the cap, the check fails their pull requests, and it checks them again when one is closed or converted to a draft.
- Rebase only to resolve a conflict; the merge queue tests every pull request against the latest `main`.

### Adding a changeset

Every pull request that changes packages must include a changeset, otherwise your changes won't be published to npm. CI enforces this: the Changeset Semver Check fails a pull request that edits a published package's shipped files without a changeset naming that package. Tests and top-level Markdown files do not count, comment-only source edits do, and a `package.json` edit counts when it changes what consumers install. Bumping `version`, editing `devDependencies` or a `scripts` entry nobody installing your package runs, and moving the range (not the name) of a dependency on another workspace package are all handled by the release itself, so they need nothing from you; every other field needs a changeset naming that package, `exports`, `files`, `bin`, `sideEffects`, `engines`, `publishConfig`, `peerDependenciesMeta`, an install hook and a third-party range among them.

Note, this does not apply to packages like `@assistant-ui/docs` or `@assistant-ui/shadcn-registry` which are not published to npm, they are deployed on Vercel.

Python packages under `python/` take no changeset. Leave their `pyproject.toml` version alone too: a maintainer bumps it in a release pull request right before publishing to PyPI, and the Changeset Semver Check fails a pull request that changes it alongside other package edits.

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
