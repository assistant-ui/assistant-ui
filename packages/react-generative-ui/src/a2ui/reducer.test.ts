import { describe, expect, it } from "vitest";
import { applyA2uiOperations } from "./reducer";
import type { A2uiState, A2uiSurfaceState } from "./types";

describe("applyA2uiOperations", () => {
  it("applies create, component upsert, data model update, and delete operations without mutating prior state", () => {
    const initial: A2uiState = new Map();
    const created = applyA2uiOperations(initial, [
      {
        version: "v0.9",
        createSurface: { surfaceId: "main", catalogId: "default" },
      },
      {
        version: "v0.9",
        updateComponents: {
          surfaceId: "main",
          components: [
            { id: "root", component: "Text", text: "first" },
            { id: "root", component: "Text", text: "second" },
          ],
        },
      },
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "main",
          path: "/profile/name",
          contents: "Ada",
          value: "ignored",
          data: "ignored",
        },
      },
    ]);

    expect(initial.size).toBe(0);
    expect(created.warnings).toEqual([]);
    expect(created.state.get("main")).toMatchObject({
      dataModel: { profile: { name: "Ada" } },
    });
    expect(created.state.get("main")?.components.get("root")).toEqual({
      id: "root",
      component: "Text",
      text: "second",
    });

    const removed = applyA2uiOperations(created.state, [
      {
        version: "v1.0",
        deleteSurface: { surfaceId: "main" },
      },
    ]);

    expect(removed.warnings).toEqual([]);
    expect(removed.state.has("main")).toBe(false);
    expect(created.state.has("main")).toBe(true);
  });

  it("accepts v1.0 inline components and data model as initial state", () => {
    const result = applyA2uiOperations(new Map(), [
      {
        version: "v1.0",
        createSurface: {
          surfaceId: "inline",
          surfaceProperties: { ignored: true },
          sendDataModel: true,
          components: [
            { id: "root", component: "Text", text: { path: "/message" } },
          ],
          dataModel: { message: "hello" },
        },
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.state.get("inline")).toMatchObject({
      dataModel: { message: "hello" },
    });
    expect(result.state.get("inline")?.components.get("root")).toEqual({
      id: "root",
      component: "Text",
      text: { path: "/message" },
    });
  });

  it("clones the touched surface and component map", () => {
    const components = new Map<string, Record<string, unknown>>([
      ["root", { id: "root", component: "Divider" }],
    ]);
    const surface: A2uiSurfaceState = {
      components,
      dataModel: { value: 1 },
    };
    const state: A2uiState = new Map([["main", surface]]);

    const result = applyA2uiOperations(state, [
      {
        version: "v1.0",
        updateComponents: {
          surfaceId: "main",
          components: [{ id: "next", component: "Divider" }],
        },
      },
    ]);

    expect(result.state.get("main")).not.toBe(surface);
    expect(result.state.get("main")?.components).not.toBe(components);
    expect(components.has("next")).toBe(false);
    expect(result.state.get("main")?.components.has("next")).toBe(true);
  });

  it("skips unknown operations with a warning naming the key", () => {
    const result = applyA2uiOperations(new Map(), [
      {
        version: "v1.0",
        animateSurface: { surfaceId: "main" },
      },
    ]);

    expect(result.state.size).toBe(0);
    expect(result.warnings).toHaveLength(1);
    expect(result.warnings[0]).toContain("animateSurface");
  });

  it("tolerates non-array input and malformed entries", () => {
    const nonArray = applyA2uiOperations(new Map(), { version: "v1.0" });
    expect(nonArray.state.size).toBe(0);
    expect(nonArray.warnings).toHaveLength(1);

    const malformed = applyA2uiOperations(new Map(), [
      null,
      42,
      {},
      { version: "v2.0", deleteSurface: { surfaceId: "main" } },
      {
        version: "v1.0",
        createSurface: { surfaceId: "main" },
        deleteSurface: { surfaceId: "main" },
      },
      { version: "v1.0", updateComponents: null },
      { version: "v1.0", deleteSurface: {} },
    ]);

    expect(malformed.state.size).toBe(0);
    expect(malformed.warnings).toHaveLength(7);
  });
});
