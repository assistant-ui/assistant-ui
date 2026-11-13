import { describe, expect, it } from "vitest";
import { createDocumentStore } from "./document-store";
import { createDocumentToolkit } from "./document-toolkit";

const setup = () => {
  const store = createDocumentStore("# Launch plan\n\nShip on Friday.");
  const toolkit = createDocumentToolkit(store);
  const run = (name: string, args: Record<string, unknown>) => {
    const execute = toolkit[name]?.execute;
    if (!execute) throw new Error(`${name} has no executor`);
    return execute(args, {} as never);
  };
  return { store, toolkit, run };
};

describe("createDocumentToolkit", () => {
  it("exposes the tools the instructions name", () => {
    expect(Object.keys(setup().toolkit)).toEqual([
      "read_document",
      "edit_document",
      "write_document",
    ]);
  });

  it("reads the document and the user's selection", async () => {
    const { store, run } = setup();
    store.getState().setSelection("Friday");

    expect(await run("read_document", {})).toEqual({
      content: "# Launch plan\n\nShip on Friday.",
      selection: "Friday",
    });
  });

  it("edits one passage", async () => {
    const { store, run } = setup();

    const result = await run("edit_document", {
      find: "Friday",
      replace: "Monday",
    });

    expect(result).toMatchObject({ ok: true });
    expect(store.getState().content).toBe("# Launch plan\n\nShip on Monday.");
  });

  it("reports an edit that does not apply instead of throwing", async () => {
    const { store, run } = setup();

    const result = await run("edit_document", {
      find: "Tuesday",
      replace: "Monday",
    });

    expect(result).toMatchObject({ ok: false, error: expect.any(String) });
    expect(store.getState().content).toBe("# Launch plan\n\nShip on Friday.");
  });

  it("rewrites the whole document", async () => {
    const { store, run } = setup();

    await run("write_document", { content: "# Launch\n\nMonday." });

    expect(store.getState().content).toBe("# Launch\n\nMonday.");
  });
});
