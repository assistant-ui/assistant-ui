import { describe, expect, it, vi } from "vitest";
import { buildInteractableModelContext } from "./interactable-model-context";
import type { InteractableDefinition } from "./scopes";

const def = (
  id: string,
  name: string,
  state: unknown,
  selected = false,
): InteractableDefinition => ({
  id,
  name,
  description: `desc of ${name}`,
  stateSchema: { type: "object" as const, properties: {} },
  state,
  selected,
});

describe("legacy buildInteractableModelContext", () => {
  it("removes only the root requirement from update parameters", async () => {
    const schema = {
      type: "object" as const,
      properties: {
        settings: {
          type: "object" as const,
          properties: {
            name: { type: "string" as const },
            size: { type: "number" as const },
          },
          required: ["name", "size"],
        },
      },
      required: ["settings"],
    };
    const definitions = {
      "form-1": {
        ...def("form-1", "form", { settings: { name: "old", size: 1 } }),
        stateSchema: schema,
      },
    };
    const ctx = buildInteractableModelContext(
      definitions,
      new Map([["form-1", schema]]),
      (_id, updater) => {
        definitions["form-1"].state = updater(definitions["form-1"].state);
      },
    );

    const parameters = ctx!.tools.update_form!.parameters as {
      required?: string[];
      properties: { settings: { required?: string[] } };
    };
    expect(parameters.required).toBeUndefined();
    expect(parameters.properties.settings.required).toEqual(["name", "size"]);

    await ctx!.tools.update_form!.execute!(
      { settings: { name: "new", size: 2 } },
      {} as never,
    );
    expect(definitions["form-1"].state).toEqual({
      settings: { name: "new", size: 2 },
    });
  });

  it("preserves per-instance update tools and selected system context", async () => {
    const definitions = {
      "note-1": def("note-1", "note", { title: "one" }, true),
      "note-2": def("note-2", "note", { title: "two" }),
    };
    const setDefState = vi.fn(
      (id: string, updater: (prev: unknown) => unknown) => {
        const current = definitions[id as keyof typeof definitions];
        if (current) current.state = updater(current.state);
      },
    );

    const ctx = buildInteractableModelContext(
      definitions,
      new Map(),
      setDefState,
    );

    expect(Object.keys(ctx!.tools).sort()).toEqual([
      "update_note_note-1",
      "update_note_note-2",
    ]);
    expect(ctx!.system).toContain(
      'Interactable component "note" [id="note-1"] (SELECTED)',
    );

    await ctx!.tools["update_note_note-2"]!.execute!(
      { title: "updated" },
      {} as never,
    );

    expect(definitions["note-1"].state).toEqual({ title: "one" });
    expect(definitions["note-2"].state).toEqual({ title: "updated" });
  });
});
