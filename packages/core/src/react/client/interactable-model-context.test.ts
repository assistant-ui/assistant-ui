import { beforeEach, describe, expect, it, vi } from "vitest";

const mockGenerateId = vi.hoisted(() => vi.fn(() => "generated-id"));

vi.mock("../../utils/id", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../../utils/id")>()),
  generateId: mockGenerateId,
}));

import {
  buildInteractableModelContext,
  type PartialJSONSchema,
} from "./interactable-model-context";
import type { Unstable_InteractableDefinition } from "../types/scopes/interactables";

const def = (
  id: string,
  name: string,
  state: unknown = {},
): Unstable_InteractableDefinition => ({
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

const partialTaskBoardSchema = {
  type: "object" as const,
  properties: {
    tasks: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          id: { type: "string" as const },
          title: { type: "string" as const },
          done: { type: "boolean" as const },
        },
        required: ["id", "title", "done"],
      },
    },
  },
};

const build = (
  definitions: Record<string, Unstable_InteractableDefinition>,
  cache: Map<string, PartialJSONSchema> = new Map([["n1", partialNoteSchema]]),
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

beforeEach(() => {
  mockGenerateId.mockReset();
  mockGenerateId.mockReturnValue("generated-id");
});

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

  it("keeps the reserved id parameter when the state schema also has id", () => {
    const userIdProperty = { type: "number" as const };
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const { ctx } = build(
        { n1: def("n1", "note") },
        new Map([
          [
            "n1",
            {
              type: "object" as const,
              properties: {
                id: userIdProperty,
                title: { type: "string" as const },
              },
            },
          ],
        ]),
      );
      const params = ctx!.tools["update_note"]!.parameters as {
        properties: Record<string, { type: string }>;
        required?: string[];
      };

      expect(Object.keys(params.properties)).toEqual(["id", "title"]);
      expect(params.properties.id).toEqual({
        type: "string",
        description:
          "The id of the instance to update, as shown in its state snapshot in the conversation.",
      });
      expect(params.properties.id).not.toBe(userIdProperty);
      expect(params.required).toEqual(["id"]);
      expect(warn).toHaveBeenCalledOnce();
    } finally {
      warn.mockRestore();
    }
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

  it("exposes operation schemas for array fields", () => {
    const { ctx } = build(
      { b1: def("b1", "taskBoard") },
      new Map([["b1", partialTaskBoardSchema]]),
    );
    const params = ctx!.tools["update_taskBoard"]!.parameters as {
      properties: {
        tasks: {
          type: string;
          properties: Record<string, unknown>;
        };
      };
    };

    expect(params.properties.tasks.type).toBe("object");
    expect(Object.keys(params.properties.tasks.properties).sort()).toEqual([
      "add",
      "clear",
      "remove",
      "update",
    ]);
  });

  it("omits id from add items but keeps it for update", () => {
    const { ctx } = build(
      { b1: def("b1", "taskBoard") },
      new Map([["b1", partialTaskBoardSchema]]),
    );
    const tasks = (
      ctx!.tools["update_taskBoard"]!.parameters as {
        properties: {
          tasks: {
            properties: {
              add: { items: { properties: object; required?: string[] } };
              update: { items: { required?: string[] } };
            };
          };
        };
      }
    ).properties.tasks.properties;

    expect(Object.keys(tasks.add.items.properties)).not.toContain("id");
    expect(tasks.add.items.required ?? []).not.toContain("id");
    expect(tasks.update.items.required).toEqual(["id"]);
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
      expect(result).toEqual({ success: true, id: "n2" });
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
      expect(result).toEqual({ success: true, id: "n1" });
      expect(defs.n1.state).toEqual({ title: "B" });
    });

    it("mints an id for an added item that has none", async () => {
      const defs = { b1: def("b1", "taskBoard", { tasks: [] }) };
      const { ctx } = build(defs, new Map([["b1", partialTaskBoardSchema]]));
      const result = await ctx!.tools["update_taskBoard"]!.execute!(
        { id: "b1", tasks: { add: [{ title: "Write tests", done: false }] } },
        {} as never,
      );
      expect(result).toEqual({
        success: true,
        id: "b1",
        addedItemIds: { tasks: ["generated-id"] },
      });
      const tasks = (defs.b1.state as { tasks: Record<string, unknown>[] })
        .tasks;
      expect(tasks).toHaveLength(1);
      expect(tasks[0]).toEqual({
        title: "Write tests",
        done: false,
        id: "generated-id",
      });
      expect(mockGenerateId).toHaveBeenCalledOnce();
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

    it("applies array operations", async () => {
      const defs = {
        b1: def("b1", "taskBoard", {
          tasks: [
            { id: "a", title: "A", done: false },
            { id: "b", title: "B", done: false },
          ],
        }),
      };
      const { ctx } = build(defs, new Map([["b1", partialTaskBoardSchema]]));

      await ctx!.tools["update_taskBoard"]!.execute!(
        {
          id: "b1",
          tasks: {
            update: [{ id: "a", done: true }],
            remove: ["b"],
            add: [{ id: "c", title: "C", done: false }],
          },
        },
        {} as never,
      );

      expect(defs.b1.state).toEqual({
        tasks: [
          { id: "a", title: "A", done: true },
          { id: "c", title: "C", done: false },
        ],
      });
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
      expect(result).toEqual({ success: true, id: "note-12" });
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

    it("streams array operations from the call baseline", async () => {
      const defs = {
        b1: def("b1", "taskBoard", {
          tasks: [{ id: "a", title: "A", done: false }],
        }),
      };
      const { ctx } = build(defs, new Map([["b1", partialTaskBoardSchema]]));
      const context = { toolCallId: "call-1" } as never;

      await ctx!.tools["update_taskBoard"]!.streamCall!(
        makeReader([
          { id: "b1", tasks: { add: [{ id: "b", title: "B" }] } },
          {
            id: "b1",
            tasks: { add: [{ id: "b", title: "B", done: false }] },
          },
        ]),
        context,
      );

      expect(defs.b1.state).toEqual({
        tasks: [
          { id: "a", title: "A", done: false },
          { id: "b", title: "B", done: false },
        ],
      });

      await ctx!.tools["update_taskBoard"]!.execute!(
        {
          id: "b1",
          tasks: { add: [{ id: "b", title: "B", done: false }] },
        },
        context,
      );

      expect(defs.b1.state).toEqual({
        tasks: [
          { id: "a", title: "A", done: false },
          { id: "b", title: "B", done: false },
        ],
      });
    });
  });
});
