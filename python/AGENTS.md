# python

The Python packages, outside the pnpm workspace; the root AGENTS.md still applies.

## Commands

- `uv sync --all-extras && uv run pytest` inside a package, as `.github/workflows/python-tests.yaml` runs it.

## Rules

- Never add a changeset for a change confined to `python/`, because a changeset can only name an npm package and naming one releases it with nothing changed.
- Bump a published package's `pyproject.toml` version in the PR that changes it and regenerate its tracked `uv.lock`, because the PyPI workflow skips a version that is already published.
