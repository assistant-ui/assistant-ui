import { describe, expect, it } from "vitest";
import {
  paginateDays,
  plainText,
  summarizeRelease,
  type ChangelogDay,
} from "./changelog-pages";

const commit = "fc73a27c08a7826000bd30950df9dc664a9b5d59";
const body = `### Patch Changes

- [#9026](https://github.com/assistant-ui/assistant-ui/pull/9026) [\`fc73a27\`](https://github.com/assistant-ui/assistant-ui/commit/${commit}) - fix(core): retry a failed save ([@kr1shna-exe](https://github.com/kr1shna-exe))

- Updated dependencies [[\`fc73a27\`](https://github.com/assistant-ui/assistant-ui/commit/${commit})]:
  - @assistant-ui/core@0.3.25
`;

describe("summarizeRelease", () => {
  it("keeps what the list shows and drops the raw body", () => {
    const release = summarizeRelease({
      pkg: "@assistant-ui/react",
      version: "0.14.23",
      body,
      url: "https://github.com/assistant-ui/assistant-ui/releases/tag/x",
      date: "2026-11-24T10:00:00Z",
    });

    expect(release).toMatchObject({
      pkg: "@assistant-ui/react",
      version: "0.14.23",
      semver: "patch",
      count: 1,
      quiet: false,
      headline: "retry a failed save",
    });
    expect(release.groups).toEqual([
      {
        type: "fix",
        items: [
          expect.objectContaining({
            scope: "core",
            pr: {
              number: "9026",
              url: "https://github.com/assistant-ui/assistant-ui/pull/9026",
            },
            author: {
              handle: "kr1shna-exe",
              url: "https://github.com/kr1shna-exe",
            },
          }),
        ],
      },
    ]);
    expect(release).not.toHaveProperty("body");
    expect(JSON.stringify(release)).not.toContain("Updated dependencies");
  });

  it("marks a release with only dependency updates as quiet and names them", () => {
    const release = summarizeRelease({
      pkg: "@assistant-ui/react-ink",
      version: "0.0.29",
      body: `### Patch Changes

- Updated dependencies [[\`fc73a27\`](https://github.com/assistant-ui/assistant-ui/commit/${commit})]:
  - @assistant-ui/core@0.3.25
`,
      url: "https://github.com/assistant-ui/assistant-ui/releases/tag/y",
      date: "2026-11-24T10:00:00Z",
    });
    expect(release).toMatchObject({
      count: 0,
      quiet: true,
      groups: [],
      preamble: "Updated dependencies: `@assistant-ui/core@0.3.25`",
      headline: "Updated dependencies: @assistant-ui/core@0.3.25",
    });
  });
});

describe("plainText", () => {
  it("drops links, code ticks and emphasis but keeps underscores in names", () => {
    expect(
      plainText(
        "[`use_state`](https://example.com) is **now** _stable_ in __core__",
      ),
    ).toBe("use_state is now stable in core");
    expect(plainText("`MAX_TOKENS` and snake_case_name stay")).toBe(
      "MAX_TOKENS and snake_case_name stay",
    );
  });
});

function day(date: string, changes: number[]): ChangelogDay {
  return {
    date,
    releases: changes.map((count, i) => ({
      pkg: `pkg-${i}`,
      version: "1.0.0",
      url: "",
      preamble: "",
      groups: [],
      semver: null,
      count,
      quiet: false,
      headline: "",
    })),
  };
}

const dates = (pages: ChangelogDay[][]) =>
  pages.map((page) => page.map((d) => d.date));

describe("paginateDays", () => {
  it("puts at most `days` days on a page", () => {
    const days = ["a", "b", "c", "d", "e"].map((date) => day(date, [0]));
    expect(dates(paginateDays(days, { days: 2, rows: 100 }))).toEqual([
      ["a", "b"],
      ["c", "d"],
      ["e"],
    ]);
  });

  it("closes a page before the day that would pass the row budget", () => {
    // Rows per day: one per release plus its changes, so 5, 5, 4 and 2.
    const days = [
      day("a", [4]),
      day("b", [2, 1]),
      day("c", [3]),
      day("d", [1]),
    ];
    expect(dates(paginateDays(days, { days: 8, rows: 10 }))).toEqual([
      ["a", "b"],
      ["c", "d"],
    ]);
  });

  it("gives a day over the budget a page of its own", () => {
    const days = [day("a", [1]), day("b", [50]), day("c", [1])];
    expect(dates(paginateDays(days, { days: 8, rows: 10 }))).toEqual([
      ["a"],
      ["b"],
      ["c"],
    ]);
  });

  it("returns no pages for no days", () => {
    expect(paginateDays([])).toEqual([]);
  });
});
