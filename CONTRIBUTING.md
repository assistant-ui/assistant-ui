## CONTRIBUTING

A big welcome and thank you for considering contributing to assistant-ui! It's people like you that make it a reality for users in our community.

You can contribute by opening an issue, or by making a pull request. For large pull requests, we ask that you open an issue first to discuss the changes before submitting a pull request.

### Setting up your environment

You need to have Node.js (v24+) and pnpm installed on your computer.

**Quick setup for new contributors:**

```sh
make setup
```

This will check prerequisites, install dependencies, and build all packages.

**Or manually:**

```sh
make install    # Install dependencies
make build      # Build all packages
```

(some packages rely on build outputs from other packages, even if you want to start the project in development mode)

### Running the project

To run the docs project in development mode:

```sh
make dev
```

To run an example project:

```sh
make example EXAMPLE=with-langgraph
```

To see all available examples:

```sh
make list-examples
```

### Code quality

```sh
make lint       # Check code with biome
make fix        # Auto-fix linting issues
make test       # Run all tests
```

### Adding a changeset

Every pull request that changes packages must include a changeset, otherwise your changes won't be published to npm.

Note, this does not apply to packages like `@assistant-ui/docs` or `@assistant-ui/shadcn-registry` which are not published to npm, they are deployed on Vercel.

Create a changeset by running:

```sh
make changeset
```

This will detect which packages changed and prompt you to select type (major, minor, patch) and a description of your changes. For now, most changes in assistant-ui should be classified as a patch.

If you forget to add a changeset before merging, create a new PR and run `make changeset` locally to create a changeset. You'll be prompted to manually select the packages that were changed, set update type, and add description. Commit the changeset file, push the changes, and merge the PR.

You can also add changesets on open PRs directly from GitHub using the changeset bot's link in PR comments.

### Available make commands

Run `make help` to see all available commands:

| Command | Description |
|---------|-------------|
| `make setup` | Full setup for new contributors |
| `make install` | Install all dependencies |
| `make build` | Build all packages and apps |
| `make dev` | Run docs in development mode |
| `make example EXAMPLE=name` | Run a specific example |
| `make lint` | Check code with biome |
| `make fix` | Fix linting issues |
| `make test` | Run all tests |
| `make changeset` | Create a new changeset |
| `make clean` | Clean build artifacts |
| `make pristine` | Reset to fresh git clone state |

### Releasing

Our CI checks for changesets in `.changeset/` on `main` and will create an "update versions" PR which versions the packages, updates the changelog, and publishes the packages to npm on merge.
