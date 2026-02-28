---
name: assistant-ui-bug-report
description: Draft and file high-quality bug reports for assistant-ui using GitHub Issues via gh CLI. Use when a user asks to report a bug, when an error/regression is discovered during coding or testing, or when an issue needs clear reproduction and context for maintainers.
---

# Bug Report Skill

Create and submit actionable bug reports to:
- https://github.com/assistant-ui/assistant-ui

Prefer GitHub CLI (`gh`) for issue creation.

## Required report content

Always include:
1. Type of work being done when the issue occurred
2. Reproduction steps
3. Context (environment, branch/commit, package/app area, logs)

Also include expected vs actual behavior and impact when available.

## Workflow

1. Confirm scope
- Ensure the bug belongs to `assistant-ui/assistant-ui`.

2. Gather evidence
- Capture exact error messages, stack traces, and relevant file paths.
- Note environment details:
  - OS
  - Node/pnpm versions
  - package(s) touched
  - branch and commit SHA

3. Attempt a minimal repro script
- Try to produce a small deterministic repro.
- Timebox effort. If a reliable repro script becomes complex, stop and continue without it.
- If skipped, explicitly state that a script was attempted but not feasible in reasonable time.

4. Draft the issue body
- Use the structure from `references/issue-template.md`.
- Keep the title specific: `"[area] short failure mode"`.

5. Create the issue with `gh`
- Write the issue markdown to a temp file.
- Create with:
  - `gh issue create --repo assistant-ui/assistant-ui --title "<title>" --body-file <file>`

6. Return the created issue URL
- Include the final issue link in your response.

## Commands

Check prerequisites:

```bash
command -v gh
gh auth status
```

Create via CLI:

```bash
cat > /tmp/bug-issue.md <<'EOF'
## Summary
<what broke and impact>

## Type Of Work In Progress
<what the agent was doing>

## Reproduction Steps
1. ...
2. ...
3. ...

## Expected Behavior
<expected>

## Actual Behavior
<actual>

## Context
- Environment: <OS, Node, pnpm>
- Repository state: <branch, commit>
- Area/package: <package or app>
- Logs/errors: <key logs>

## Repro Script (Optional)
<include minimal script or say it was attempted but too complex>
EOF

gh issue create \
  --repo assistant-ui/assistant-ui \
  --title "[area] concise bug summary" \
  --body-file /tmp/bug-issue.md
```

If `gh` is unavailable or unauthenticated:
1. Produce the final markdown body.
2. Provide the exact `gh issue create` command for the user to run.
