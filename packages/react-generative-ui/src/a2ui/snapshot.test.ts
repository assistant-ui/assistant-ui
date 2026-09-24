import { describe, expect, it } from "vitest";
import { surfaceToOperations } from "./snapshot";
import { A2UI_SURFACE_ID, type A2uiSurfaceState } from "./types";

const surface = (dataModel: unknown): A2uiSurfaceState => ({
  components: new Map([["root", { id: "root", component: "Text" }]]),
  dataModel,
});

describe("surfaceToOperations", () => {
  it("uses an explicit surface id and omits an undefined data model", () => {
    const value = Object.defineProperty(surface(undefined), A2UI_SURFACE_ID, {
      value: "stored",
    });

    expect(surfaceToOperations(value, "provided")).toEqual([
      {
        version: "v0.9",
        createSurface: { surfaceId: "provided" },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "provided",
          components: [{ id: "root", component: "Text" }],
        },
      },
    ]);
  });

  it("uses the reducer surface id when no explicit id is supplied", () => {
    const value = Object.defineProperty(surface(null), A2UI_SURFACE_ID, {
      value: "stored",
    });

    expect(surfaceToOperations(value)).toMatchObject([
      { createSurface: { surfaceId: "stored" } },
      { updateComponents: { surfaceId: "stored" } },
      { updateDataModel: { surfaceId: "stored", contents: null } },
    ]);
  });

  it("requires either an explicit or reducer surface id", () => {
    expect(() => surfaceToOperations(surface({}))).toThrow(
      "A2UI surfaces must have a surface id to be replayed.",
    );
  });
  it("rejects an empty surface id", () => {
    const value = { components: new Map(), dataModel: undefined };
    expect(() => surfaceToOperations(value, "")).toThrow();
  });
});
