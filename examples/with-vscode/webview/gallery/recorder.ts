/**
 * Records what goes wrong while the gallery renders and attributes it to the
 * section being shown in isolation, or to `ALL_SECTIONS` when every section
 * is mounted. Import it first so it sees errors from the first render.
 */

export const ALL_SECTIONS = "(all sections)";

export type IssueKind = "csp" | "error" | "console" | "boundary";

export type Issue = { section: string; kind: IssueKind; message: string };

const issues: Issue[] = [];
let active = ALL_SECTIONS;

export const setActiveSection = (section: string | null) => {
  active = section ?? ALL_SECTIONS;
};

export const recordIssue = (
  kind: IssueKind,
  message: string,
  section = active,
) => {
  issues.push({ section, kind, message: message.slice(0, 300) });
};

/** Issues recorded after `mark`, which `issueMark()` returned earlier. */
export const issuesSince = (mark: number) => issues.slice(mark);

export const issueMark = () => issues.length;

const describe = (value: unknown): string => {
  if (value instanceof Error) return `${value.name}: ${value.message}`;
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
};

document.addEventListener("securitypolicyviolation", (event) => {
  recordIssue(
    "csp",
    `${event.effectiveDirective} ${event.blockedURI || event.sample}`.trim(),
  );
});

window.addEventListener("error", (event) => {
  recordIssue("error", describe(event.error ?? event.message));
});

window.addEventListener("unhandledrejection", (event) => {
  recordIssue("error", `Unhandled rejection: ${describe(event.reason)}`);
});

const consoleError = console.error.bind(console);
console.error = (...args: unknown[]) => {
  recordIssue("console", args.map(describe).join(" "));
  consoleError(...args);
};
