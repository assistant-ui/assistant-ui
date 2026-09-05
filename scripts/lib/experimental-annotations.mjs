// The grammar for `@deprecated` tags on experimental (`unstable_`) API. The
// strikethrough is the only stability signal that reaches a user's editor,
// because experimental exports ship from the same barrel as stable ones; the
// tag text is what tells a reader which of the two kinds of strikethrough they
// are looking at, so its shape is fixed and enforced rather than free prose.

export const EXPERIMENTAL_PREFIX_PATTERN =
  /^(?:unstable_|Unstable_|experimental_)/;

export const EXPERIMENTAL_BOILERPLATE =
  "Not scheduled for removal; the API may change in any release.";

export const EXPERIMENTAL_WINDOW_DAYS = 90;

export const STALE_AFTER_DAYS = 365;

const DATE = String.raw`\d{4}-\d{2}-\d{2}`;

const EXPERIMENTAL_TAG = new RegExp(
  String.raw`^Experimental since (${DATE})(?:, extended (${DATE}))*\.`,
);

const CANONICAL_TAG = new RegExp(
  String.raw`^Experimental since (${DATE})((?:, extended ${DATE})*)\. ` +
    `${EXPERIMENTAL_BOILERPLATE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}` +
    String.raw`(?:\s+(\S[\s\S]*))?$`,
);

function isRealDate(value) {
  const date = new Date(`${value}T00:00:00Z`);
  return (
    !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
  );
}

export function addDays(day, days) {
  const date = new Date(`${day}T00:00:00Z`);
  date.setUTCDate(date.getUTCDate() + days);
  return date.toISOString().slice(0, 10);
}

// A `@deprecated` tag is experimental when it opens with `Experimental`, and an
// ordinary deprecation otherwise. The classification is the first word rather
// than a match against the whole text so that the 170-odd existing deprecations
// keep their free-form wording.
export function parseDeprecatedTag(text) {
  const value = (text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return { kind: "empty" };
  if (!value.startsWith("Experimental")) {
    return { kind: "deprecated", prose: value };
  }

  const canonical = value.match(CANONICAL_TAG);
  if (!canonical) {
    return {
      kind: "invalid",
      reason: EXPERIMENTAL_TAG.test(value)
        ? `must read "Experimental since <date>[, extended <date>]. ${EXPERIMENTAL_BOILERPLATE}"`
        : 'must open with "Experimental since <YYYY-MM-DD>."',
    };
  }

  const [, since, extensions = "", prose] = canonical;
  const extended = [
    ...extensions.matchAll(new RegExp(`, extended (${DATE})`, "g")),
  ].map((match) => match[1]);
  const dates = [since, ...extended];
  const invalidDate = dates.find((date) => !isRealDate(date));
  if (invalidDate) {
    return { kind: "invalid", reason: `${invalidDate} is not a real date` };
  }
  for (let index = 1; index < dates.length; index += 1) {
    if (dates[index] <= dates[index - 1]) {
      return {
        kind: "invalid",
        reason: `extension ${dates[index]} does not come after ${dates[index - 1]}`,
      };
    }
  }

  return {
    kind: "experimental",
    since,
    extended,
    prose: prose?.trim() || undefined,
  };
}

// The review date is the last explicit extension, or one window after the ship
// date. Keeping the window in code rather than in every comment is what lets it
// be retuned without rewriting the annotations, and what makes an extension an
// additive edit that a reviewer can see.
export function reviewDate(record, windowDays = EXPERIMENTAL_WINDOW_DAYS) {
  const last = record.extended?.at(-1);
  return last ?? addDays(record.since, windowDays);
}

export function today() {
  return new Date().toISOString().slice(0, 10);
}
