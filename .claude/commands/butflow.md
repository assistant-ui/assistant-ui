---
description: "GitButler CI review flow: implement, PR, monitor CI, address reviews, merge"
---

GitButler CI flow. Multiple agents may run concurrently.

## Flow

1. `but pull` → implement → new branch → stage → commit → push → `gh pr create`.
2. Add `.changeset/*.md` (patch) if a published package changed.
3. Schedule a 2-min cron to monitor. Merge with `gh pr merge <n> --squash --admin`.

## Cron cycle

Run every cycle:
1. `gh pr checks <n>`
2. `gh api repos/assistant-ui/assistant-ui/pulls/<n>/comments` — inline comments. For thread ids, GraphQL `reviewThreads { nodes { id isResolved comments { nodes { databaseId body author { login } } } } }`.
3. `gh pr view <n> --json reviews`

## Before merging

Every review thread — human or bot — must be resolved. For each:
- **Valid** → fix in a follow-up commit.
- **Invalid** → reply with a short rationale via `gh api /repos/assistant-ui/assistant-ui/pulls/<n>/comments/<comment_id>/replies -f body=...`, then resolve:
  ```
  gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<threadId>
  ```

Merge once all non-cubic checks pass and every thread is resolved.

## Gotchas

- Ambiguous `but stage` id → `but status -j`, use the longer form.
- One branch per change group.
