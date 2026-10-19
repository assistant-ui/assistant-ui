import { parseTitleType } from "./review-policy.mjs";

// The text under a `## <heading>` of a description whose HTML comments are
// already removed, or null when the heading is absent.
export function sectionText(body, heading) {
  const match = new RegExp(`^## ${heading}[ \\t]*\\r?$`, "im").exec(body);
  return match
    ? body.slice(match.index + match[0].length).split(/^##[ \t]+/m)[0]
    : null;
}

const verifiedTypes = ["fix", "feat", "perf", "refactor"];

// Advice never blocks a merge. It names what a reviewer would otherwise have
// to find out for themselves.
export function advise(
  { number, title, body, authorIsBot, hasLinkedIssue, linkedIssues },
  policy,
) {
  const type = parseTitleType(policy, title);
  const isEmpty = (heading) => !sectionText(body, heading)?.trim();
  // Issues and pull requests can link across repositories, so a bare
  // `#number` is only right for this one.
  const ref = (item) =>
    item.repository === policy.repository
      ? `#${item.number}`
      : `${item.repository}#${item.number}`;
  const isThis = (other) =>
    other.number === number && other.repository === policy.repository;
  const lines = linkedIssues.flatMap((issue) =>
    issue.pullRequests
      .filter((other) => !isThis(other) && other.state !== "CLOSED")
      .map((other) => {
        // Every PR in a stack cites the same decision issue and only the last
        // one closes it, so that one is named as closing it, not as a duplicate.
        if (!issue.closing)
          return `${ref(other)} ${other.state === "MERGED" ? "closed" : "closes"} ${ref(issue)}, which this PR cites as its decision`;
        return other.state === "MERGED"
          ? `${ref(other)} already merged for ${ref(issue)}`
          : `${ref(other)} is also open for ${ref(issue)}`;
      }),
  );
  if (type === "feat" && !hasLinkedIssue)
    lines.push(
      "a `feat` links the issue where a maintainer confirmed the direction, and none is linked",
    );
  if (verifiedTypes.includes(type) && isEmpty("Verification"))
    lines.push(
      "the description has no Verification text; list the exact tests and checks that were run",
    );
  if (!authorIsBot && isEmpty("AI use"))
    lines.push(
      "the description has no AI use text; name the tools that wrote code and how their output was verified, or write None",
    );
  return lines;
}
