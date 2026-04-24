---
description: "GitButler CI review flow: implement, PR, monitor CI, address reviews, merge"
---

The user has requested butflow mode. Implement features, open PRs via GitButler, iterate on CI/review feedback, and merge. Multiple agents may run concurrently.

## Flow

1. `but pull` → implement → lint/build/test → `but branch` → stage → commit → push → `gh pr create`.
2. Add `.changeset/*.md` (patch) if a published package changed.
3. Schedule a 2-min cron to monitor. Merge with `gh pr merge <n> --squash --admin` (cubic is optional — don't wait for it).

## Cron cycle

1. `gh pr checks <n>`
2. Review threads — `id` is the GraphQL node id for the resolve mutation; `databaseId` on each comment is the REST integer for replies:
   ```
   gh api graphql -f query='query { repository(owner:"assistant-ui",name:"assistant-ui") { pullRequest(number:<n>) { reviewThreads(first:100) { nodes { id isResolved isOutdated comments(first:50) { nodes { databaseId body author { login } } } } } } } }'
   ```
3. `gh pr view <n> --json reviews`

## Addressing threads

Every unresolved thread must get a reply and a resolve:
- **Valid** → fix in a follow-up commit, reply with the fix SHA, resolve.
- **Invalid** → reply with a short rationale, resolve.
- **Outdated** (`isOutdated: true`) → the diff moved; reply noting that and resolve.

Use judgment on bot nits. Common-sense suggestions that just duplicate what a competent agent already knows aren't worth a fix commit — reply-and-resolve those. Scope creep from a long bot-feedback loop is a signal to cut and merge.

```
gh api /repos/assistant-ui/assistant-ui/pulls/<n>/comments/<databaseId>/replies -f body='...'
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<threadId>
```

## Merge gate

- All non-cubic CI checks pass.
- Every thread is resolved.
- No non-cubic reviewer's current state is `CHANGES_REQUESTED` — address and wait for re-approve, don't dismiss.

## Gotchas

- Ambiguous `but stage` id → `but status -j`, use the longer form.
- One branch per change group; stage, commit, push, PR independently.
