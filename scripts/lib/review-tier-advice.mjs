// Advice never blocks a merge. It names what a reviewer would otherwise have
// to find out for themselves.

export function advise({ number, closingIssues }) {
  return closingIssues.flatMap((issue) =>
    issue.pullRequests
      .filter((other) => other.number !== number && other.state !== "CLOSED")
      .map((other) =>
        other.state === "MERGED"
          ? `#${other.number} already merged for #${issue.number}`
          : `#${other.number} is also open for #${issue.number}`,
      ),
  );
}
