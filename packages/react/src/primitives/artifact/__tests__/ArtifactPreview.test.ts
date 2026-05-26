import { describe, it, expect } from "vitest";
import { ArtifactPrimitivePreview } from "../ArtifactPreview";
import * as ArtifactBarrel from "../../artifact";

describe("ArtifactPrimitive.Preview", () => {
  it("has the correct displayName", () => {
    expect(ArtifactPrimitivePreview.displayName).toBe(
      "ArtifactPrimitive.Preview",
    );
  });
});

describe("ArtifactPrimitive barrel exports", () => {
  it("exports Root", () => {
    expect(ArtifactBarrel.Root).toBeDefined();
  });

  it("exports Source", () => {
    expect(ArtifactBarrel.Source).toBeDefined();
  });

  it("exports If", () => {
    expect(ArtifactBarrel.If).toBeDefined();
  });

  it("exports Preview", () => {
    expect(ArtifactBarrel.Preview).toBeDefined();
  });

  it("Preview has correct displayName", () => {
    expect(ArtifactBarrel.Preview.displayName).toBe(
      "ArtifactPrimitive.Preview",
    );
  });
});
