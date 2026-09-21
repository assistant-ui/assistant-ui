import {
  DEFAULT_LEARN_COURSE_ID,
  getLearnCourse,
  getLearnStage,
  LearnRegistryError,
} from "./registry";
import { listZipEntries } from "../demo-downloads/zip";
import {
  createLearnStageZipFromSnapshot,
  getLearnStageArchiveFilename,
  resolveStageFilesFromSnapshot,
} from "./stage-source";

describe("resolveStageFiles", () => {
  it("materializes shared files and selects only the registered project root", async () => {
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

    await expect(
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", snapshot),
    ).resolves.toEqual({
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

  it("lets stage-local source override a shared file", async () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles, "shared"),
      ...sharedSourceSnapshot(stage.sharedFiles, "shared"),
      [`${stage.sourceRoot}/next.config.ts`]: "stage local",
    };

    const files = await resolveStageFilesFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S0",
      snapshot,
    );

    expect(files["next.config.ts"]).toBe("stage local");
  });

  it("inherits and overlays each earlier stage", async () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles, "course shared"),
      ...Object.fromEntries(
        Object.values(course.stages).flatMap((stage) => [
          ...Object.values(stage.sharedFiles ?? {}).map((snapshotPath) => [
            snapshotPath,
            `config ${stage.id}`,
          ]),
          [`${stage.sourceRoot}/stage-${stage.id}.txt`, stage.id],
          [`${stage.sourceRoot}/app/version.ts`, stage.id],
        ]),
      ),
    };

    const files = await resolveStageFilesFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S7",
      snapshot,
    );

    expect(files["stage-S0.txt"]).toBe("S0");
    expect(files["stage-S7.txt"]).toBe("S7");
    expect(files["app/version.ts"]).toBe("S7");
    expect(files["next.config.ts"]).toBe("config S7");
  });

  it("normalizes preview-only cross-stage imports in materialized source", async () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stageS0 = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    const stageS1 = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S1");
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles, "shared"),
      ...sharedSourceSnapshot(stageS0.sharedFiles, "shared"),
      ...sharedSourceSnapshot(stageS1.sharedFiles, "shared"),
      [`${stageS0.sourceRoot}/components/tool.tsx`]: "export const tool = 1;",
      [`${stageS1.sourceRoot}/app/page.tsx`]:
        'import { tool } from "@/lib/xulux/learn/courses/build-generative-ui-assistant/stages/S0/project/components/tool";',
    };

    const files = await resolveStageFilesFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S1",
      snapshot,
    );

    expect(files["app/page.tsx"]).toBe(
      'import { tool } from "../components/tool";',
    );
  });

  it("rejects unregistered IDs before reading the snapshot", async () => {
    await expect(
      resolveStageFilesFromSnapshot("missing-course", "S0", {}),
    ).rejects.toThrow(/Unregistered Learn course/);
    await expect(
      resolveStageFilesFromSnapshot(
        DEFAULT_LEARN_COURSE_ID,
        "missing-stage",
        {},
      ),
    ).rejects.toThrow(/Unregistered Learn stage/);
  });

  it("fails when a registered stage has no tracked source", async () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    await expect(
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", {
        ...sharedSourceSnapshot(course.sharedFiles, "shared"),
        ...sharedSourceSnapshot(stage.sharedFiles, "shared"),
      }),
    ).rejects.toThrow(/No source snapshot files found/);
  });

  it("fails when a registered shared source is missing", async () => {
    await expect(
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", {}),
    ).rejects.toThrow(/Missing shared Learn source snapshot file/);
  });

  it("packages the exact materialized stage file map", async () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S7");
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles, "shared"),
      ...Object.fromEntries(
        Object.values(course.stages).flatMap((item) => [
          ...Object.values(item.sharedFiles ?? {}).map((snapshotPath) => [
            snapshotPath,
            snapshotPath,
          ]),
          [`${item.sourceRoot}/stage-${item.id}.txt`, item.id],
        ]),
      ),
      [`${stage.sourceRoot}/app/page.tsx`]: "page",
    };
    const files = await resolveStageFilesFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S7",
      snapshot,
    );
    const zip = await createLearnStageZipFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S7",
      snapshot,
    );

    expect(listZipEntries(zip)).toEqual(Object.keys(files).sort());
    expect(getLearnStageArchiveFilename(DEFAULT_LEARN_COURSE_ID, "S7")).toBe(
      "xulux-build-generative-ui-assistant-s7.zip",
    );
  });

  it("rejects unregistered stage downloads", async () => {
    await expect(
      createLearnStageZipFromSnapshot(
        DEFAULT_LEARN_COURSE_ID,
        "missing-stage",
        {},
      ),
    ).rejects.toThrow(LearnRegistryError);
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
