import { describe, expect, it } from "vitest";
import { parseRelease } from "./changelog-parse";

const commit = (sha: string) =>
  `[\`${sha.slice(0, 7)}\`](https://github.com/assistant-ui/assistant-ui/commit/${sha})`;
const fix = `- [#10797](https://github.com/assistant-ui/assistant-ui/pull/10797) ${commit("a926a19a80d1220925b36628f1a62614a7c767f9")} - fix(cli): open setup with what it is ([@Yonom](https://github.com/Yonom))`;
const deps = `- Updated dependencies [${commit("4a0d2a5b9f04c8fb7ff9cd224827a958096b52dc")}, ${commit("f91eb36ee688059c9eed90cc85b223f7bb035c11")}]:
  - setup-agent@0.2.3
  - @assistant-ui/core@0.3.25`;

describe("parseRelease", () => {
  it("drops an Updated dependencies bullet with its list of packages", () => {
    const { bullets, preamble } = parseRelease(
      `### Patch Changes\n\n${fix}\n${deps}`,
    );
    expect(preamble).toBe("");
    expect(bullets).toHaveLength(1);
    expect(bullets[0]).toMatchObject({
      type: "fix",
      scope: "cli",
      description: "open setup with what it is",
      body: "",
    });
  });

  it("leaves no change behind for a release that only bumps dependencies", () => {
    expect(parseRelease(`### Patch Changes\n\n${deps}\n`)).toEqual({
      preamble: "",
      bullets: [],
      dependencies: ["setup-agent@0.2.3", "@assistant-ui/core@0.3.25"],
    });
  });

  it("keeps the bullets after an Updated dependencies bullet", () => {
    const { bullets } = parseRelease(
      `### Patch Changes\n\n${deps}\n\n${fix}\n`.replace(/\n/g, "\r\n"),
    );
    expect(bullets.map((bullet) => bullet.pr?.number)).toEqual(["10797"]);
    expect(bullets[0]?.body).toBe("");
  });
});
