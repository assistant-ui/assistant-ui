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

This will detect which packages changed and prompt you to select type (major, minor, patch) and a description of your changes. For now, most changes in assistant-ui should be classified as a patch.

If you forget to add a changeset before merging, create a new PR and run `pnpm changeset` locally to create a changeset. You'll be prompted to manually select the packages that were changed, set update type, and add description. Commit the changeset file, push the changes, and merge the PR.

You can also add changesets on open PRs directly from GitHub using the changeset bot's link in PR comments.

### Releasing
Our CI checks for changesets in `.changeset/` on `main` and will create an "update versions" PR which versions the packages, updates the changelog, and publishes the packages to npm on merge.