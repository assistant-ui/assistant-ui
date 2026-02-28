---
name: changeset
description: Create and update Changesets non-interactively for this monorepo. Use when a PR changes published packages and needs a release note, or when a user asks to add/fix a changeset without using the interactive CLI.
---

# Changeset Skill

Create `.changeset/*.md` files without running the interactive `pnpm changeset` prompt.

## Scope

Use this skill for this repository's Changesets workflow.

## Workflow

1. Decide if a changeset is required
- Required for changes to published packages.
- Usually not required for docs/examples/tooling-only changes.
- See `references/when-required.md`.

2. Choose bump level per package
- `patch`: bug fixes, internal improvements, non-breaking behavior tweaks.
- `minor`: backward-compatible feature additions.
- `major`: breaking changes.
- See `references/bump-guidelines.md`.

3. Create the changeset file non-interactively
- Preferred helper:
  - `skills/changeset/scripts/make_changeset.sh`
- Manual fallback:
  - write `.changeset/<name>.md` directly with YAML frontmatter.

4. Validate
- Check format and package list:
  - `pnpm changeset status --verbose`

## Commands

Create a changeset with the helper:

```bash
skills/changeset/scripts/make_changeset.sh \
  --release "@assistant-ui/react:patch" \
  --summary "fix: preserve composer draft after reconnect" \
  --details "Keep unsent input in reconnect flows to avoid accidental data loss."
```

Multiple packages:

```bash
skills/changeset/scripts/make_changeset.sh \
  --release "@assistant-ui/react:minor" \
  --release "@assistant-ui/react-ai-sdk:patch" \
  --summary "feat: add model metadata to runtime hooks" \
  --details-file /tmp/changeset-details.md
```

Manual file format:

```md
---
"@assistant-ui/react": patch
"@assistant-ui/react-ai-sdk": minor
---

feat: concise summary of user-visible change

Optional details with migration or usage notes.
```

## Guardrails

- Do not use interactive `pnpm changeset` unless the user explicitly requests it.
- Keep summary concise and user-facing.
- Include all affected published packages in one changeset when they are part of the same change.
- Skip changesets only when clearly unnecessary and explain why.
