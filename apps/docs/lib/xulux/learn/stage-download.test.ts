import { listZipEntries } from "../demo-downloads/zip";
import {
  DEFAULT_LEARN_COURSE_ID,
  getLearnCourse,
  getLearnStage,
} from "./registry";
import {
  createLearnStageZipFromSnapshot,
  getLearnStageArchiveFilename,
} from "./stage-download";
import { resolveStageFilesFromSnapshot } from "./stage-source";

describe("Learn stage downloads", () => {
  it("packages the exact file map selected for the registered stage", () => {
    const course = getLearnCourse(DEFAULT_LEARN_COURSE_ID);
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S7");
    const snapshot = {
      ...sharedSourceSnapshot(course.sharedFiles),
      ...sharedSourceSnapshot(stage.sharedFiles),
      [`${stage.sourceRoot}/app/page.tsx`]: "page",
      [`${stage.sourceRoot}/components/assistant.tsx`]: "assistant",
      "apps/docs/private.ts": "unrelated",
    };
    const files = resolveStageFilesFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S7",
      snapshot,
    );
    const zip = createLearnStageZipFromSnapshot(
      DEFAULT_LEARN_COURSE_ID,
      "S7",
      snapshot,
    );

    expect(listZipEntries(zip)).toEqual(Object.keys(files).sort());
    expect(getLearnStageArchiveFilename(DEFAULT_LEARN_COURSE_ID, "S7")).toBe(
      "xulux-build-generative-ui-assistant-s7.zip",
    );
  });

  it("rejects unregistered stage IDs", () => {
    expect(() =>
      createLearnStageZipFromSnapshot(
        DEFAULT_LEARN_COURSE_ID,
        "missing-stage",
        {},
      ),
    ).toThrow(/Unregistered Learn stage/);
  });
});

function sharedSourceSnapshot(sharedFiles: Record<string, string> | undefined) {
  return Object.fromEntries(
    Object.values(sharedFiles ?? {}).map((snapshotPath) => [
      snapshotPath,
      snapshotPath,
    ]),
  );
}
