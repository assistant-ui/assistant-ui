import { DEFAULT_LEARN_COURSE_ID, getLearnStage } from "./registry";
import { resolveStageFilesFromSnapshot } from "./stage-source";

describe("resolveStageFiles", () => {
  it("selects only files below the registered project root", () => {
    const stage = getLearnStage(DEFAULT_LEARN_COURSE_ID, "S0");
    const snapshot = {
      [`${stage.sourceRoot}/app/page.tsx`]: "export default function Page() {}",
      [`${stage.sourceRoot}/components/card.tsx`]: "export const Card = 1;",
      [`${stage.sourceRoot}-other/secret.ts`]: "not part of the project",
      "apps/docs/lib/xulux/learn/registry.ts": "unrelated monorepo source",
    };

    expect(
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", snapshot),
    ).toEqual({
      "app/page.tsx": "export default function Page() {}",
      "components/card.tsx": "export const Card = 1;",
    });
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
    expect(() =>
      resolveStageFilesFromSnapshot(DEFAULT_LEARN_COURSE_ID, "S0", {}),
    ).toThrow(/No source snapshot files found/);
  });
});
