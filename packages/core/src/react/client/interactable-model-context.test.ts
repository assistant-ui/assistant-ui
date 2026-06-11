import { describe, expect, it, vi } from "vitest";
import { buildInteractableModelContext } from "./interactable-model-context";
import type { InteractableDefinition } from "../types/scopes/interactables";

const def = (
  id: string,
  name: string,
  state: unknown = {},
): InteractableDefinition => ({
  id,
  name,
  description: `desc of ${name}`,
  stateSchema: { type: "object", properties: {} },
  state,
  initialState: state,
});

const partialNoteSchema = {
  type: "object" as const,
  properties: { title: { type: "string" as const } },
};

const build = (
  definitions: Record<string, InteractableDefinition>,
  cache = new Map([["n1", partialNoteSchema]]),
) => {
  const setDefState = vi.fn(
    (id: string, updater: (prev: unknown) => unknown) => {
      const d = definitions[id];
      if (d) definitions[id] = { ...d, state: updater(d.state) };
    },
  );
  const ctx = buildInteractableModelContext(definitions, cache, setDefState);
  return { ctx, setDefState };
};

describe("buildInteractableModelContext", () => {
  it("returns undefined with no definitions", () => {
    expect(build({}).ctx).toBeUndefined();
  });

  it("creates one tool per name regardless of instance count", () => {
    const defs = {
      n1: def("n1", "note"),
      n2: def("n2", "note"),
      b1: def("b1", "board"),
    };
    const { ctx } = build(defs);
    expect(Object.keys(ctx!.tools).sort()).toEqual([
      "update_board",
      "update_note",
    ]);
  });

  it("wraps the partial schema with a required id parameter", () => {
    const { ctx } = build({ n1: def("n1", "note") });
    const params = ctx!.tools["update_note"]!.parameters as {
      properties: Record<string, unknown>;
      required?: string[];
    };
    expect(Object.keys(params.properties)).toEqual(["id", "title"]);
    expect(params.required).toEqual(["id"]);
  });

  it("falls back to a permissive schema when the partial conversion failed", () => {
    const { ctx } = build({ n1: def("n1", "note") }, new Map());
    const params = ctx!.tools["update_note"]!.parameters as {
      properties: Record<string, unknown>;
      required?: string[];
      additionalProperties?: boolean;
    };
    expect(params.required).toEqual(["id"]);
    expect(params.additionalProperties).toBe(true);
  });

  describe("execute", () => {
    it("routes the partial update to the instance with the given id", async () => {
      const defs = {
        n1: def("n1", "note", { title: "a", color: "yellow" }),
        n2: def("n2", "note", { title: "b", color: "blue" }),
      };
      const { ctx } = build(defs);
      const result = await ctx!.tools["update_note"]!.execute!(
        { id: "n2", title: "B!" },
        {} as never,
      );
      expect(result).toEqual({ success: true });
      expect(defs.n2.state).toEqual({ title: "B!", color: "blue" });
      expect(defs.n1.state).toEqual({ title: "a", color: "yellow" });
    });

    it("accepts an id-less call while exactly one instance exists", async () => {
      const defs = { n1: def("n1", "note", { title: "a" }) };
      const { ctx } = build(defs);
      const result = await ctx!.tools["update_note"]!.execute!(
        { title: "B" },
        {} as never,
      );
      expect(result).toEqual({ success: true });
      expect(defs.n1.state).toEqual({ title: "B" });
    });

    it("rejects an unknown id and lists valid ids", async () => {
      const defs = { n1: def("n1", "note"), n2: def("n2", "note") };
      const { ctx, setDefState } = build(defs);
      const result = (await ctx!.tools["update_note"]!.execute!(
        { id: "nope", title: "B" },
        {} as never,
      )) as { success: boolean; error?: string };
      expect(result.success).toBe(false);
      expect(result.error).toContain("n1");
      expect(result.error).toContain("n2");
      expect(setDefState).not.toHaveBeenCalled();
    });

    it("rejects an id-less call when multiple instances exist", async () => {
      const defs = { n1: def("n1", "note"), n2: def("n2", "note") };
      const { ctx, setDefState } = build(defs);
      const result = (await ctx!.tools["update_note"]!.execute!(
        { title: "B" },
        {} as never,
      )) as { success: boolean };
      expect(result.success).toBe(false);
      expect(setDefState).not.toHaveBeenCalled();
    });

    it("rejects an id that belongs to a different name", async () => {
      const defs = { n1: def("n1", "note"), b1: def("b1", "board") };
      const { ctx } = build(defs);
      const result = (await ctx!.tools["update_note"]!.execute!(
        { id: "b1", title: "B" },
        {} as never,
      )) as { success: boolean };
      expect(result.success).toBe(false);
    });
  });

  describe("streamCall", () => {
    const makeReader = (values: unknown[]) =>
      ({
        args: {
          streamValues: async function* () {
            yield* values;
          },
        },
      }) as never;

    it("applies partial values once the id is followed by state fields", async () => {
      const defs = {
        n1: def("n1", "note", { title: "a" }),
        n2: def("n2", "note", { title: "b" }),
      };
      const { ctx, setDefState } = build(defs);
      await ctx!.tools["update_note"]!.streamCall!(
        makeReader([
          { id: "n" },
          { id: "n2" },
          { id: "n2", title: "B" },
          { id: "n2", title: "B!" },
        ]),
        {} as never,
      );
      expect(defs.n2.state).toEqual({ title: "B!" });
      expect(defs.n1.state).toEqual({ title: "a" });
      expect(setDefState).toHaveBeenCalledTimes(2);
    });

    it("does not route id-last prefix chunks to the wrong instance", async () => {
      const defs = {
        "note-1": def("note-1", "note", { title: "a" }),
        "note-12": def("note-12", "note", { title: "b" }),
      };
      const { ctx, setDefState } = build(defs);
      await ctx!.tools["update_note"]!.streamCall!(
        makeReader([
          { title: "B", id: "note-1" },
          { title: "B", id: "note-12" },
        ]),
        {} as never,
      );
      expect(defs["note-1"].state).toEqual({ title: "a" });
      expect(defs["note-12"].state).toEqual({ title: "b" });
      expect(setDefState).not.toHaveBeenCalled();

      const result = await ctx!.tools["update_note"]!.execute!(
        { title: "B", id: "note-12" },
        {} as never,
      );
      expect(result).toEqual({ success: true });
      expect(defs["note-12"].state).toEqual({ title: "B" });
    });

    it("streams id-less values to a single instance", async () => {
      const defs = { n1: def("n1", "note", { title: "a" }) };
      const { ctx } = build(defs);
      await ctx!.tools["update_note"]!.streamCall!(
        makeReader([{ title: "B" }]),
        {} as never,
      );
      expect(defs.n1.state).toEqual({ title: "B" });
    });
  });
});
