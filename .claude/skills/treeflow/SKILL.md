---
name: treeflow
description: Use when the user asks for treeflow mode, wants a git-worktree-driven implementation flow, or asks to implement a change through PR creation, CI monitoring, and review-thread resolution in the assistant-ui monorepo. The opt-in `auto` mode also merges the PR.
---

# Treeflow

Implement the change in its own git worktree, open a PR, monitor CI and reviews, and address feedback until the PR is ready to merge. Multiple agents may run concurrently, so keep one worktree and one branch per change group, and leave the primary checkout and other worktrees untouched.

## Modes

- Default: stop once the merge gate is clear, leave the PR open, and report that it is ready.
- `auto`: merge the PR once the merge gate is clear. Use it only when the user opts in, by passing `auto` as an argument or asking for the PR to be landed or merged; never infer it.

## Flow

1. Run `git fetch origin main`.
2. Create the worktree and branch with `git worktree add --no-track -b <branch-name> .worktrees/<branch-name> origin/main`.
3. Work only inside `.worktrees/<branch-name>` from here on, and run `CI=true pnpm install --frozen-lockfile` there, because a new worktree has no `node_modules`.
4. Implement the requested change.
5. Validate with the repo-appropriate lint/build/test commands. For assistant-ui, default to `pnpm lint` and `pnpm build` unless the task clearly warrants narrower checks.
6. Stage only the intended files with `git add <file>`, then commit with `git commit -m "<message>"`.
7. Push with `git push -u origin <branch-name>`.
8. Open the PR with `gh pr create --title "<title>" --body "<body>"` or another non-interactive form such as `--fill`.
9. Schedule a 2-minute recurring monitor using the environment's native automation mechanism. In Claude Code, use the available `schedule` or `loop` skill.
10. Monitor checks and review threads until the merge gate is satisfied, committing and pushing follow-up fixes from the same worktree.
11. Stop the monitor, then finish per the mode: in default mode, report the PR as ready; in `auto` mode, merge with `gh pr merge <n> --squash --admin`, then clean up.

Add a patch changeset only if a published package changed. Private packages such as `@assistant-ui/docs` and `@assistant-ui/shadcn-registry` are exempt.

## Cleanup

Keep the worktree while the PR is open, because follow-up fixes land from it. After the PR merges, run these from the primary checkout:

```bash
git worktree remove .worktrees/<branch-name>
git branch -D <branch-name>
```

`git worktree remove` refuses a worktree with uncommitted changes; inspect them instead of passing `--force`.

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

Use judgment on bot nits. Common-sense suggestions that duplicate what a competent agent already knows are usually reply-and-resolve. Scope creep from long bot-feedback loops is a signal to cut.

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

A clear gate makes the PR ready. In default mode, the maintainer decides whether to merge; say in the PR what needs judging, such as a novel mechanism, a real tradeoff, or a public API change. In `auto` mode, merge once the gate is clear.
