# python

The Python packages, outside the pnpm workspace; the root AGENTS.md still applies.

## Commands

- `uv sync --all-extras && uv run pytest` inside a package, as `.github/workflows/python-tests.yaml` runs it.

## Rules

- Never add a changeset for a change confined to `python/`, because a changeset can only name an npm package and naming one releases it with nothing changed.
- Leave a package's `pyproject.toml` version to the maintainer's release PR, which changes no other package file except `uv.lock`; the Semver Check job fails a version change mixed with other package edits.
