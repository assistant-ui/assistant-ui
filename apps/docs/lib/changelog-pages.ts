import {
  groupByType,
  parseRelease,
  type ChangeType,
  type ParsedBullet,
} from "@/lib/changelog-parse";
import type { PackageRelease, ReleaseGroup } from "@/lib/releases";

const QUIET_TYPES: ReadonlySet<ChangeType> = new Set([
  "chore",
  "ci",
  "build",
  "test",
  "style",
  "other",
]);

/**
 * One release as the changelog shows it. The raw markdown body stays on the
 * server: it repeats every link in full and carries the "Updated
 * dependencies" lists the page drops, so sending it to the client list would
 * roughly double the page's payload.
 */
export type ChangelogRelease = {
  pkg: string;
  version: string;
  url: string;
  preamble: string;
  groups: { type: ChangeType; items: ParsedBullet[] }[];
  semver: "major" | "minor" | "patch" | null;
  count: number;
  quiet: boolean;
  headline: string;
};

export type ChangelogDay = {
  date: string;
  releases: ChangelogRelease[];
};

function extractChangeType(
  markdown: string,
): "major" | "minor" | "patch" | null {
  const match = markdown.match(/^#{1,6}\s+(Major|Minor|Patch)\s+Changes/im);
  if (!match) return null;
  return match[1]!.toLowerCase() as "major" | "minor" | "patch";
}

/**
 * Markdown to the plain text of a one-line headline: link text, no code
 * ticks, no emphasis. An underscore counts as emphasis only around a whole
 * word, so identifiers like `use_state` keep theirs.
 */
export function plainText(markdown: string): string {
  return markdown
    .replace(/\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/[`*]/g, "")
    .replace(/(^|[^\w])__?(?=\S)(.*?\S)__?(?![\w])/g, "$1$2");
}

export function summarizeRelease(release: PackageRelease): ChangelogRelease {
  const parsed = parseRelease(release.body);
  // A release that only bumps dependencies says which ones, rather than
  // showing no notes.
  if (
    parsed.bullets.length === 0 &&
    !parsed.preamble &&
    parsed.dependencies.length > 0
  ) {
    parsed.preamble = `Updated dependencies: ${parsed.dependencies
      .map((dependency) => `\`${dependency}\``)
      .join(", ")}`;
  }
  const groups = groupByType(parsed.bullets);
  const semver = extractChangeType(release.body);
  const count = parsed.bullets.length;
  const notable = semver === "major" || semver === "minor";
  const quiet =
    !notable &&
    (parsed.bullets.length === 0
      ? true
      : parsed.bullets.every((bullet) => QUIET_TYPES.has(bullet.type)));
  const headlineBullet =
    groups.find((group) => !QUIET_TYPES.has(group.type))?.items[0] ??
    groups[0]?.items[0];
  const headline = headlineBullet
    ? plainText(headlineBullet.description)
    : parsed.preamble
      ? plainText(parsed.preamble.split("\n")[0] ?? "")
      : "";
  return {
    pkg: release.pkg,
    version: release.version,
    url: release.url,
    preamble: parsed.preamble,
    groups,
    semver,
    count,
    quiet,
    headline,
  };
}

export function summarizeDays(groups: ReleaseGroup[]): ChangelogDay[] {
  return groups.map((group) => ({
    date: group.date,
    releases: group.releases.map(summarizeRelease),
  }));
}

/** Rows a day renders: one per release plus one per change in it. */
function dayRows(day: ChangelogDay): number {
  return day.releases.reduce((rows, release) => rows + 1 + release.count, 0);
}

export const CHANGELOG_PAGE_LIMITS = {
  /** Days on one page. */
  days: 8,
  /**
   * Rows on one page. A row costs about 2 KB of HTML and payload, so a full
   * page stays under 1 MB, well under the 2 MB at which site audits flag a
   * page; eight busy days can hold 1,400 changes. A single day over the
   * limit still gets one page of its own (the biggest, 780 rows, is 0.63 MB).
   */
  rows: 400,
} as const;

/**
 * Splits days (newest first) into pages of whole days. A page closes at
 * `limits.days` days, or before the day that would take it past
 * `limits.rows` rows. A day bigger than the row limit gets a page of its own
 * rather than being split across two.
 */
export function paginateDays(
  days: ChangelogDay[],
  limits: { days: number; rows: number } = CHANGELOG_PAGE_LIMITS,
): ChangelogDay[][] {
  const pages: ChangelogDay[][] = [];
  let page: ChangelogDay[] = [];
  let rows = 0;
  for (const day of days) {
    const size = dayRows(day);
    if (
      page.length > 0 &&
      (page.length >= limits.days || rows + size > limits.rows)
    ) {
      pages.push(page);
      page = [];
      rows = 0;
    }
    page.push(day);
    rows += size;
  }
  if (page.length > 0) pages.push(page);
  return pages;
}
