// TypeScript strikes through a symbol only for `@deprecated`, so experimental
// API carries that tag too, and the fixed opening sentence is what tells it
// apart from a removal notice.

export const EXPERIMENTAL_NAME =
  /^(?:[A-Z][A-Za-z]*Primitive)?(?:unstable_|Unstable_|experimental_)/;

export const EXPERIMENTAL_NOTICE =
  "Not scheduled for removal; the API may change in any release.";

const EXPERIMENTAL_TAG = new RegExp(
  String.raw`^Experimental since (\d{4}-\d{2}-\d{2})\. ` +
    EXPERIMENTAL_NOTICE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") +
    "$",
);

export function experimentalTag(since) {
  return `Experimental since ${since}. ${EXPERIMENTAL_NOTICE}`;
}

function isCalendarDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function parseDeprecatedTag(text) {
  const value = text.replace(/\s+/g, " ").trim();
  if (!value) return { kind: "empty" };
  if (!value.startsWith("Experimental")) return { kind: "deprecated" };
  const match = EXPERIMENTAL_TAG.exec(value);
  if (!match) {
    return {
      kind: "invalid",
      reason: `must read "${experimentalTag("<YYYY-MM-DD>")}"`,
    };
  }
  const [, since] = match;
  if (!isCalendarDate(since)) {
    return { kind: "invalid", reason: `${since} is not a calendar date` };
  }
  return { kind: "experimental", since };
}
