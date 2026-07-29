import {
  createLearnFileRecords,
  parseXuluxFileReference,
} from "./file-reference";

describe("parseXuluxFileReference", () => {
  it("parses a complete course-relative path", () => {
    expect(parseXuluxFileReference("xulux-file:course:app/page.tsx")).toEqual({
      scope: "course",
      path: "app/page.tsx",
    });
  });

  it.each([
    "app/page.tsx",
    "xulux-file:repo:packages/react/index.ts",
    "xulux-file:course:",
    "xulux-file:course:/app/page.tsx",
    "xulux-file:course:../app/page.tsx",
    "xulux-file:course:app/../page.tsx",
    "xulux-file:course:app//page.tsx",
    "xulux-file:course:app\\page.tsx",
    "xulux-file:course:app/page.tsx?raw=1",
    "xulux-file:course:app/page.tsx#L1",
  ])("rejects unsupported or unsafe input: %s", (value) => {
    expect(parseXuluxFileReference(value)).toBeNull();
  });
});

describe("createLearnFileRecords", () => {
  it("classifies unchanged, added, modified, and deleted files", () => {
    const records = createLearnFileRecords(
      {
        "app/deleted.ts": "remove me\n",
        "app/modified.ts": "before\n",
        "app/unchanged.ts": "same\n",
      },
      {
        "app/added.ts": "new\n",
        "app/modified.ts": "after\n",
        "app/unchanged.ts": "same\n",
      },
    );

    expect(records.get("app/unchanged.ts")).toMatchObject({
      status: "unchanged",
      previousContent: "same\n",
      currentContent: "same\n",
      additions: 0,
      deletions: 0,
    });
    expect(records.get("app/added.ts")).toMatchObject({
      status: "added",
      previousContent: undefined,
      currentContent: "new\n",
      additions: 1,
      deletions: 0,
    });
    expect(records.get("app/modified.ts")).toMatchObject({
      status: "modified",
      previousContent: "before\n",
      currentContent: "after\n",
      additions: 1,
      deletions: 1,
    });
    expect(records.get("app/deleted.ts")).toMatchObject({
      status: "deleted",
      previousContent: "remove me\n",
      currentContent: undefined,
      additions: 0,
      deletions: 1,
    });
  });
});
