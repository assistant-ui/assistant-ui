import { overrideSignal } from "./review-policy.mjs";

export function evaluateRequirements(input, policy) {
  const admins = new Set(input.admins);
  const maintainerSet = new Set([
    ...admins,
    ...(input.teams[policy.teams.maintainers] ?? []),
  ]);
  const trusted = new Set([
    ...maintainerSet,
    ...(input.teams[policy.teams.reviewers] ?? []),
  ]);
  const owners = input.areas.map((id) => ({
    id,
    members: new Set(
      input.teams[policy.areas.find((area) => area.id === id)?.ownerTeam] ?? [],
    ),
  }));
  const ownerMembers = new Set(owners.flatMap(({ members }) => [...members]));
  const contributors = new Set(
    input.commits.flatMap(({ author, committer }) =>
      [author, committer].filter((login) => login !== null),
    ),
  );

  const latestReviews = new Map();
  for (const review of input.reviews) {
    if (
      review.state !== "APPROVED" &&
      review.state !== "CHANGES_REQUESTED" &&
      review.state !== "DISMISSED"
    ) {
      continue;
    }
    const previous = latestReviews.get(review.author);
    if (
      !previous ||
      Date.parse(review.submittedAt) >= Date.parse(previous.submittedAt)
    ) {
      latestReviews.set(review.author, review);
    }
  }

  const approvals = { counted: [], ignored: [] };
  for (const review of latestReviews.values()) {
    if (review.state !== "APPROVED") continue;
    let reason;
    if (review.author === input.author) {
      reason = "author";
    } else if (review.isBot) {
      reason = "bot";
    } else if (!trusted.has(review.author)) {
      reason = "untrusted";
    } else {
      if (review.commitSha !== input.headSha) {
        reason = "stale";
      } else if (contributors.has(review.author)) {
        reason = "contributor";
      }
    }
    if (reason) approvals.ignored.push({ login: review.author, reason });
    else approvals.counted.push(review.author);
  }

  const overrides = new Map();
  for (const label of input.labels) {
    const signal = overrideSignal(policy, label.name);
    if (
      signal !== null &&
      (admins.has(label.addedBy) || ownerMembers.has(label.addedBy)) &&
      !overrides.has(signal)
    ) {
      overrides.set(signal, label.addedBy);
    }
  }

  const unmet = [];
  const waived = [];
  const maintainerApprovals = approvals.counted.filter((login) =>
    maintainerSet.has(login),
  ).length;
  if (input.tier >= 2) {
    if (maintainerApprovals < 2) {
      unmet.push({
        code: "approvals",
        detail: `needs 2 maintainer approvals on the current head, has ${maintainerApprovals}`,
      });
    }
    for (const { id, members } of owners) {
      if (!approvals.counted.some((login) => members.has(login))) {
        unmet.push({
          code: `owner:${id}`,
          detail: `needs an approval from an owner of ${id} on the current head`,
        });
      }
    }
  } else {
    const required =
      input.tier === 0
        ? maintainerSet.has(input.author)
          ? 0
          : 1
        : trusted.has(input.author)
          ? 1
          : 2;
    const needsMaintainer = input.tier === 1 && !trusted.has(input.author);
    if (
      approvals.counted.length < required ||
      (needsMaintainer && maintainerApprovals === 0)
    ) {
      unmet.push({
        code: "approvals",
        detail: `needs ${required} approvals on the current head, has ${approvals.counted.length}${needsMaintainer ? `; needs 1 maintainer approval, has ${maintainerApprovals}` : ""}`,
      });
    }
  }

  if (input.tier === 3) {
    const decisionMembers =
      input.areas.length === 0 ? maintainerSet : ownerMembers;
    const accepted = input.linkedIssues.some((issue) =>
      issue.labels.some(
        (label) =>
          label.name === policy.labels.decisionAccepted &&
          decisionMembers.has(label.addedBy),
      ),
    );
    if (!accepted) {
      unmet.push({
        code: "decision",
        detail:
          "needs a linked issue with an accepted decision from a decision team member",
      });
    }
  }

  const windowHours = policy.windowHours[input.tier];
  const elapsed = Date.parse(input.now) - Date.parse(input.readyForReviewAt);
  if (windowHours !== undefined && !(elapsed >= windowHours * 60 * 60 * 1000)) {
    if (overrides.has("window")) {
      waived.push({
        code: "window",
        signal: "window",
        by: overrides.get("window"),
      });
    } else {
      unmet.push({
        code: "window",
        detail: `needs ${windowHours} hours since the pull request became ready for review`,
      });
    }
  }

  let hasFailure = false;
  for (const failure of input.failures) {
    if (failure.override !== null && overrides.has(failure.override)) {
      waived.push({
        code: failure.code,
        signal: failure.override,
        by: overrides.get(failure.override),
      });
    } else {
      unmet.push({ code: failure.code, detail: failure.detail });
      hasFailure = true;
    }
  }
  const openPullRequestCap = input.authorHasWriteAccess
    ? policy.openPullRequestCap.withWriteAccess
    : policy.openPullRequestCap.withoutWriteAccess;
  if (
    input.author != null &&
    !maintainerSet.has(input.author) &&
    input.openPullRequestCount > openPullRequestCap
  ) {
    unmet.push({
      code: "open-pr-cap",
      detail: `allows at most ${openPullRequestCap} open non-draft pull requests for this author, has ${input.openPullRequestCount}`,
    });
    hasFailure = true;
  }

  return {
    status: hasFailure ? "failure" : unmet.length > 0 ? "pending" : "success",
    unmet,
    waived,
    approvals,
  };
}
