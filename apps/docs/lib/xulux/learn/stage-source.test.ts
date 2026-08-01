import {
  DEFAULT_LEARN_COURSE_ID,
  getLearnCourse,
  getLearnStage,
} from "./registry";
import { resolveStageFilesFromSnapshot } from "./stage-source";

describe("resolveStageFiles", () => {
  it("materializes shared files and selects only the registered project root", () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles, "course shared"),
      ...sharedSourceSnapshot(stage.sharedFiles, "stage shared"),
      [`${stage.sourceRoot}/app/page.tsx`]: "export default function Page() {}",
      [`${stage.sourceRoot}/components/card.tsx`]: "export const Card = 1;",
      [`${stage.sourceRoot}-other/secret.ts`]: "not part of the project",
      "apps/docs/lib/xulux/learn/registry.ts": "unrelated monorepo source",
    };

    expect(
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", snapshot),
    ).toEqual({
      ".env.example": "course shared",
      "README.md": "course shared",
      "app/page.tsx": "export default function Page() {}",
      "components/card.tsx": "export const Card = 1;",
      "next.config.ts": "stage shared",
      "package.json": "course shared",
      "postcss.config.mjs": "course shared",
      "tsconfig.json": "course shared",
    });
  });

  it("lets stage-local source override a shared file", () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles, "shared"),
      ...sharedSourceSnapshot(stage.sharedFiles, "shared"),
      [`${stage.sourceRoot}/next.config.ts`]: "stage local",
    };

    expect(
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", snapshot)[
        "next.config.ts"
      ],
    ).toBe("stage local");
  });

  it("rejects unregistered IDs before reading the snapshot", () => {
    expect(() =>
      resolveStageFilesFromSnapshot("missing-course", "S0", {}),
    ).toThrow(/Unregistered Learn course/);
    expect(() =>
      resolveStageFilesFromSnapshot(
        DEFAULT_LEARN_COURSE_ID,
        "missing-stage",
        {},
      ),
    ).toThrow(/Unregistered Learn stage/);
  });

  it("fails when a registered stage has no tracked source", () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    expect(() =>
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", {
        ...sharedSourceSnapshot(course.sharedFiles, "shared"),
        ...sharedSourceSnapshot(stage.sharedFiles, "shared"),
      }),
    ).toThrow(/No source snapshot files found/);
  });

  it("fails when a registered shared source is missing", () => {
    expect(() =>
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", {}),
    ).toThrow(/Missing shared Learn source snapshot file/);
  });
});

function sharedSourceSnapshot(
  sharedFiles: Record<string, string> | undefined,
  source: string,
) {
  return Object.fromEntries(
    Object.values(sharedFiles ?? {}).map((snapshotPath) => [
      snapshotPath,
      source,
    ]),
  );
}
