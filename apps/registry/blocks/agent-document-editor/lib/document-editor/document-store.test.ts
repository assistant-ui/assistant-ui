import { describe, expect, it, vi } from "vitest";
import { createDocumentStore } from "./document-store";

describe("createDocumentStore", () => {
  it("opens with the initial content, or empty", () => {
    expect(createDocumentStore("# Brief").getState().content).toBe("# Brief");
    expect(createDocumentStore().getState().content).toBe("");
  });

  it("applies an edit that matches one passage", () => {
    const store = createDocumentStore("Ship on Friday.");

    expect(store.getState().edit("Friday", "Monday")).toMatchObject({
      ok: true,
    });
    expect(store.getState().content).toBe("Ship on Monday.");
  });

  it("leaves the document alone when an edit does not apply", () => {
    const store = createDocumentStore("Ship on Friday.");
    const listener = vi.fn<() => void>();
    store.subscribe(listener);

    expect(store.getState().edit("Tuesday", "Monday").ok).toBe(false);
    expect(store.getState().content).toBe("Ship on Friday.");
    expect(listener).not.toHaveBeenCalled();
  });

  it("notifies subscribers only when the content or selection changes", () => {
    const store = createDocumentStore("Draft");
    const listener = vi.fn<() => void>();
    store.subscribe(listener);

    store.getState().setContent("Draft");
    store.getState().setSelection("");
    expect(listener).not.toHaveBeenCalled();

    store.getState().setContent("Final");
    store.getState().setSelection("Final");
    expect(listener).toHaveBeenCalledTimes(2);
  });
});
