---
description: "GitButler CI review flow: implement, PR, monitor CI, address reviews, merge"
---

The user has requested butflow mode. Implement features, open PRs via GitButler, iterate on CI/review feedback, and merge. Multiple agents may run concurrently.

## Flow

1. `but pull` → implement → lint/build/test → `but branch` → stage → commit → push → `gh pr create`.
2. Add `.changeset/*.md` (patch) if a published package changed.
3. Schedule a 2-min cron to monitor. Merge with `gh pr merge <n> --squash --admin` (cubic is optional — don't wait for it).

## Cron cycle

Run every cycle:
1. `gh pr checks <n>`
2. Review threads — resolution state, thread node IDs (for the resolve mutation), comment `databaseId`s (REST integers for the reply endpoint), bodies, authors:
   ```
   gh api graphql -f query='query { repository(owner:"assistant-ui",name:"assistant-ui") { pullRequest(number:<n>) { reviewThreads(first:100) { nodes { id isResolved isOutdated comments(first:50) { nodes { databaseId body author { login } } } } } } } }'
   ```
3. `gh pr view <n> --json reviews`

## Before merging

Every review thread — human or bot — must be resolved. For each:
- **Valid** → fix in a follow-up commit (lint/build/test first), reply with the fix commit SHA, then resolve the thread.
- **Invalid** → reply with a short rationale, then resolve the thread.

Reply to a specific inline comment (REST; `<comment_id>` is a comment's `databaseId` from step 2):
```
gh api /repos/assistant-ui/assistant-ui/pulls/<n>/comments/<comment_id>/replies -f body='...'
```

Resolve the thread (GraphQL; `<threadId>` is the thread `id` from step 2, e.g. `PRRT_kw...`):
```
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<threadId>
```

Merge once all non-cubic checks pass, every thread is resolved (or `isOutdated` — the diff moved under the comment, so it's effectively obsolete; still reply + resolve), and no non-cubic review on the current HEAD is in `CHANGES_REQUESTED` (from step 3). If one is, either address it and wait for the reviewer to re-approve, or dismiss it — don't merge around it.

## Gotchas

- Ambiguous `but stage` id → `but status -j`, use the longer form.
- One branch per change group; stage files to each, commit/push/PR independently.
