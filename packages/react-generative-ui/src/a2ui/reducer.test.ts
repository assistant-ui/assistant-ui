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

  it.each(["10001", "4294967294"])(
    "rejects array pointer index %s beyond the auto-vivification limit",
    (index) => {
      const dataModel = { items: [] };
      const state: A2uiState = new Map([
        ["main", { components: new Map(), dataModel }],
      ]);

      const result = applyA2uiOperations(state, [
        {
          version: "v1.0",
          updateDataModel: {
            surfaceId: "main",
            path: `/items/${index}`,
            value: "unsafe",
          },
        },
      ]);

      expect(result.warnings).toEqual([
        "Operation at index 0 has an invalid JSON Pointer path.",
      ]);
      expect(result.state.get("main")?.dataModel).toBe(dataModel);
      expect(dataModel.items).toHaveLength(0);
    },
  );

  it("allows bounded expansion, existing large indices, and appends", () => {
    const items = new Array<string | undefined>(10_002);
    items[10_001] = "existing";
    const state: A2uiState = new Map([
      ["main", { components: new Map(), dataModel: { bounded: [], items } }],
    ]);

    const result = applyA2uiOperations(state, [
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/bounded/10000",
          value: "limit",
        },
      },
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/items/10001",
          value: "updated",
        },
      },
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/items/-",
          value: "appended",
        },
      },
    ]);

    const resultModel = result.state.get("main")!.dataModel as {
      bounded: string[];
      items: string[];
    };
    expect(result.warnings).toEqual([]);
    expect(resultModel.bounded).toHaveLength(10_001);
    expect(resultModel.bounded[10_000]).toBe("limit");
    expect(resultModel.items).toHaveLength(10_003);
    expect(resultModel.items[10_001]).toBe("updated");
    expect(resultModel.items[10_002]).toBe("appended");
  });

  it("stores prototype-named JSON Pointer segments as own properties", () => {
    const state: A2uiState = new Map([
      ["main", { components: new Map(), dataModel: {} }],
    ]);

    const result = applyA2uiOperations(state, [
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/__proto__/admin",
          value: true,
        },
      },
    ]);

    const resultModel = result.state.get("main")?.dataModel as Record<
      string,
      unknown
    >;
    expect(result.warnings).toEqual([]);
    expect(Object.getPrototypeOf(resultModel)).toBe(Object.prototype);
    expect(Object.hasOwn(resultModel, "__proto__")).toBe(true);
    expect(resultModel["__proto__"]).toEqual({ admin: true });
    expect(JSON.stringify(resultModel)).toBe('{"__proto__":{"admin":true}}');
  });

  it("deletes object properties updated to null", () => {
    const dataModel = {
      profile: { name: "Ada", role: "admin" },
      tags: ["first", "second"],
    };
    const state: A2uiState = new Map([
      ["main", { components: new Map(), dataModel }],
    ]);

    const result = applyA2uiOperations(state, [
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/profile/name",
          value: null,
        },
      },
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/tags/1",
          value: null,
        },
      },
    ]);

    expect(result.warnings).toEqual([]);
    const resultModel = result.state.get("main")?.dataModel as typeof dataModel;
    expect(resultModel.profile).toEqual({ role: "admin" });
    expect(resultModel.tags).toHaveLength(2);
    expect(resultModel.tags[0]).toBe("first");
    expect(Object.prototype.hasOwnProperty.call(resultModel.tags, 1)).toBe(
      false,
    );
    expect(dataModel).toEqual({
      profile: { name: "Ada", role: "admin" },
      tags: ["first", "second"],
    });
  });

  it("preserves null values in v0.9 data model updates", () => {
    const state: A2uiState = new Map([
      [
        "main",
        { components: new Map(), dataModel: { profile: { name: "Ada" } } },
      ],
    ]);

    const result = applyA2uiOperations(state, [
      {
        version: "v0.9",
        updateDataModel: {
          surfaceId: "main",
          path: "/profile/name",
          value: null,
        },
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.state.get("main")?.dataModel).toEqual({
      profile: { name: null },
    });
  });

  it("does not create missing paths for null updates", () => {
    const dataModel = { profile: { name: "Ada" }, tags: ["first", "second"] };
    const state: A2uiState = new Map([
      ["main", { components: new Map(), dataModel }],
    ]);

    const result = applyA2uiOperations(state, [
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/missing/value",
          value: null,
        },
      },
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/tags/-",
          value: null,
        },
      },
      {
        version: "v1.0",
        updateDataModel: {
          surfaceId: "main",
          path: "/tags/7",
          value: null,
        },
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.state.get("main")?.dataModel).toBe(dataModel);
  });

  it("allows null to replace the data model root", () => {
    const state: A2uiState = new Map([
      [
        "main",
        { components: new Map(), dataModel: { profile: { name: "Ada" } } },
      ],
    ]);

    const result = applyA2uiOperations(state, [
      {
        version: "v1.0",
        updateDataModel: { surfaceId: "main", value: null },
      },
    ]);

    expect(result.warnings).toEqual([]);
    expect(result.state.get("main")?.dataModel).toBeNull();
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
