---
name: change-review
description: Apply assistant-ui's existing review standards to a local change or pull request before submission and after substantive revisions. Use to compare the requested behavior with the diff, trace affected runtime paths, and assess evidence without duplicating repository policy.
---

# assistant-ui change review

## Use the existing standards

Read the applicable sources rather than maintaining another checklist here:

- [AGENTS.md](../../../AGENTS.md) and the changed directory's instructions own implementation rules. For package changes, consult [packages/AGENTS.md](../../../packages/AGENTS.md).
- The shared review criteria in `REVIEW_PROMPT` in [claude-code-review.yml](../../../.github/workflows/claude-code-review.yml) own premise checks, evidence requirements, blocking findings, and verdict style. Apply those criteria locally; the workflow's event context, tool restrictions, and comment-publication instructions apply only to its CI runs.
- [test-quality](../test-quality/SKILL.md) owns test design, mocks, and regression evidence. Use it when assessing coverage or changes to tests.
- [CONTRIBUTING.md](../../../CONTRIBUTING.md#review-policy) owns approval and merge requirements. A local review does not replace that gate.

## Establish the review boundary

Identify the requested behavior from the user's request, linked issue, or accepted design. Use the PR's declared base and head for a PR review. For local work, use the requested comparison or the intended target branch's merge-base, including the task's staged, unstaged, and new files. Keep unrelated workspace changes outside the review.

Read the changed implementation and the callers needed to connect it to the request. For each new option, export, fallback, or abstraction, trace the requirement or existing consumer it serves and look for an established implementation of that responsibility. Judge the result using the sources above.

## Trace the affected behavior

For asynchronous runtime changes, follow the initiating action through pending work, completion or rejection, and any affected switch, cancellation, retry, or disposal. Identify which operation owns each state write and whether late work can still reach it.

For UI changes, follow the affected interaction through the primitive and runtime binding. For converters and protocols, follow representative provider input through conversion to the consumer. Choose the paths relevant to the diff; an editorial change needs no runtime audit.

Use the shared review criteria to report the findings and verification limits. Keep the result in the current conversation unless publishing review feedback was requested.
