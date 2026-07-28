import { normalizeLearnSourcePath } from "./learn-source-map-tools";

describe("Learn source-map paths", () => {
  it("accepts paths relative to the selected mount", () => {
    expect(normalizeLearnSourcePath("app/page.tsx", "course")).toBe(
      "app/page.tsx",
    );
    expect(normalizeLearnSourcePath("/course/app/page.tsx", "course")).toBe(
      "app/page.tsx",
    );
    expect(normalizeLearnSourcePath("\\repo\\packages\\core.ts", "repo")).toBe(
      "packages/core.ts",
    );
  });

  it("rejects empty and traversal paths", () => {
    expect(normalizeLearnSourcePath("/course", "course")).toBeNull();
    expect(
      normalizeLearnSourcePath("/course/../repo/secret.ts", "course"),
    ).toBeNull();
  });
});
