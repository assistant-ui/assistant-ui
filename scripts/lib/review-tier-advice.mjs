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
  { number, title, body, authorIsBot, hasLinkedIssue, closingIssues },
  policy,
) {
  const type = parseTitleType(policy, title);
  const isEmpty = (heading) => !sectionText(body, heading)?.trim();
  const lines = closingIssues.flatMap((issue) =>
    issue.pullRequests
      .filter((other) => other.number !== number && other.state !== "CLOSED")
      .map((other) =>
        other.state === "MERGED"
          ? `#${other.number} already merged for #${issue.number}`
          : `#${other.number} is also open for #${issue.number}`,
      ),
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
