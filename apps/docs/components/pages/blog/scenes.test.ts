import { describe, expect, it } from "vitest";
import { buildLayers, validateScene } from "@/components/shared/glyph-scene";
import { SCENES, sceneFor } from "./scenes";

describe("blog glyph scenes", () => {
  it("every authored scene is a valid 80x30 field", () => {
    for (const [slug, scene] of Object.entries(SCENES)) {
      expect(validateScene(scene), `${slug}: ${scene.name}`).toEqual([]);
    }
  });

  it("returns the authored scene for known slugs", () => {
    expect(sceneFor("2024-07-29-hello").name).toBe("first light");
  });

  it("weaves tokens into aligned layers", () => {
    const layers = buildLayers(sceneFor("2024-07-29-hello"));
    const base = layers.base.split("\n");
    const live = layers.live.split("\n");
    const whisper = layers.whisper.split("\n");
    expect(base).toHaveLength(30);
    expect(live).toHaveLength(30);
    expect(whisper).toHaveLength(30);
    expect(live[14]!.slice(30, 35)).toBe("hello");
    expect(base[14]!.slice(30, 35)).toBe("hello");
    expect(whisper[22]!.slice(17, 38)).toBe("npx assistant-ui init");
  });

  it("generates a valid deterministic fallback for unknown slugs", () => {
    const first = sceneFor("2099-01-unknown-post");
    const second = sceneFor("2099-01-unknown-post");
    const other = sceneFor("2099-02-another-post");
    expect(validateScene(first)).toEqual([]);
    expect(validateScene(other)).toEqual([]);
    expect(first.field).toBe(second.field);
    expect(first.field).not.toBe(other.field);
  });
});
