import { describe, expect, it } from "vitest";
import { buildLayers, validateScene } from "@/components/shared/glyph-scene";
import { SCENES, sceneFor } from "./scenes";

describe("careers glyph scenes", () => {
  it("every role portrait is a valid 80x30 field", () => {
    expect(Object.keys(SCENES)).toEqual([
      "design-engineer",
      "software-engineer",
      "developer-relations",
    ]);
    for (const [slug, scene] of Object.entries(SCENES)) {
      expect(validateScene(scene), `${slug}: ${scene.name}`).toEqual([]);
    }
  });

  it("weaves the live word into the live layer", () => {
    const layers = buildLayers(sceneFor("design-engineer"));
    expect(layers.live.split("\n")[14]!.slice(40, 44)).toBe("feel");
  });

  it("falls back to a quiet field for unknown roles", () => {
    expect(validateScene(sceneFor("2099-future-role"))).toEqual([]);
  });
});
