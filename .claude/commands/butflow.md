---
description: "GitButler CI review flow: implement task, create PR, monitor CI, fix review issues, auto-merge"
---

The user has requested butflow mode. Implement features, open PRs via GitButler, iterate on CI/review feedback, and merge. Multiple agents may work on the same codebase concurrently.

## Flow

1. `but pull` → implement → lint/build/test → create GitButler branch → stage → commit → push → `gh pr create`
2. Add `.changeset/*.md` (patch) if published packages changed.
3. Set a 2-min cron to monitor CI and AI review comments. Don't wait for cubic (optional). Merge with `gh pr merge <n> --squash --admin`.

## Cron prompt template

The cron prompt MUST run ALL of these commands every cycle before deciding to merge:

```
1. `gh pr checks <n>` — check CI status
2. `gh api repos/assistant-ui/assistant-ui/pulls/<n>/comments` — check for new review comments
3. `gh pr view <n> --json reviews` — check for reviews
```

## Gotchas

- **Check for PR comments**: Review and address valid AI review bot comments, only auto-merge if all human comments are addressed.
- **Ambiguous cliIds**: if `but stage` says an ID is ambiguous, re-run `but status -j` and use the longer form.
- **Multiple PRs**: create one branch per change group, stage files to each, commit/push/PR independently.
