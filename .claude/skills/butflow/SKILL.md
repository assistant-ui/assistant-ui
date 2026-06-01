---
name: butflow
description: Use when the user asks for butflow mode, wants GitButler-driven implementation flow, or asks to implement a change through PR creation, CI monitoring, review-thread resolution, and merge in the assistant-ui monorepo.
---

# Butflow

Implement the change, open a PR through GitButler, monitor CI and reviews, address feedback, and merge when allowed. Multiple agents may run concurrently, so keep one branch per change group and avoid mixing unrelated work.

## Flow

1. Run `but pull`.
2. Implement the requested change.
3. Validate with the repo-appropriate lint/build/test commands. For assistant-ui, default to `pnpm lint`, `pnpm build`, and `pnpm test` unless the task clearly warrants narrower checks.
4. Create a GitButler branch with `but branch new <branch-name>`.
5. Stage only the intended files into that branch with `but stage <file-or-hunk> <branch>`. If a stage id is ambiguous, run `but status -j` and use the longer id or file path.
6. Commit with `but commit <branch> --only -m "<message>"`.
7. Push with `but push <branch>`.
8. Open the PR with `gh pr create`.
9. Schedule a 2-minute monitor using the environment's native automation. In Codex, use a thread heartbeat via `automation_update`; in Claude, use the available scheduled-task/cron mechanism.
10. Monitor checks and review threads until the merge gate is satisfied, then merge with `gh pr merge <n> --squash --admin`.

Add a patch changeset only if a published package changed. Private packages such as `@assistant-ui/docs` and `@assistant-ui/shadcn-registry` are exempt.

## Monitor Cycle

Run:

```bash
gh pr checks <n>
gh pr view <n> --json reviews
gh api graphql -f query='query { repository(owner:"assistant-ui",name:"assistant-ui") { pullRequest(number:<n>) { reviewThreads(first:100) { nodes { id isResolved isOutdated comments(first:50) { nodes { databaseId body author { login } } } } } } } }'
```

In review threads, `id` is the GraphQL node id for resolving the thread. `databaseId` on each comment is the REST integer for replies.

## Addressing Threads

Every unresolved thread must get a reply and be resolved.

- Valid: fix in a follow-up commit, reply with the fix SHA, then resolve.
- Invalid: reply with a short rationale, then resolve.
- Outdated: if `isOutdated: true`, reply that the diff moved, then resolve.

Use judgment on bot nits. Common-sense suggestions that duplicate what a competent agent already knows are usually reply-and-resolve. Scope creep from long bot-feedback loops is a signal to cut and merge.

Do not add comments or changeset prose that only exist to acknowledge review feedback. Test: would you write it if no reviewer had flagged the code? If no, drop it.

```bash
gh api /repos/assistant-ui/assistant-ui/pulls/<n>/comments/<databaseId>/replies -f body='...'
gh api graphql -f query='mutation($id:ID!){resolveReviewThread(input:{threadId:$id}){thread{isResolved}}}' -f id=<threadId>
```

## Merge Gate

- All non-cubic CI checks pass.
- Every review thread is resolved.
- No non-cubic reviewer has a current `CHANGES_REQUESTED` state. Address and wait for re-approval instead of dismissing.

Cubic is optional; do not wait for it if the other gates are clear.
