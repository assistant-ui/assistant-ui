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
