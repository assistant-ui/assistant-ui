import { describe, expect, it } from "vitest";
import {
  applyUIUpdate,
  extractUIUpdate,
  foldUIUpdates,
  isUIUpdate,
  mergeUIMessages,
} from "./uiMessages";
import type { UIMessage } from "./types";

const ui = (id: string, props: Record<string, unknown> = {}): UIMessage => ({
  type: "ui",
  id,
  name: "chart",
  props,
});

describe("isUIUpdate", () => {
  it("accepts ui and remove-ui objects with a string id", () => {
    expect(isUIUpdate({ type: "ui", id: "a", name: "x", props: {} })).toBe(
      true,
    );
    expect(isUIUpdate({ type: "remove-ui", id: "a" })).toBe(true);
  });

  it("accepts an array of updates", () => {
    expect(
      isUIUpdate([
        { type: "ui", id: "a", name: "x", props: {} },
        { type: "remove-ui", id: "b" },
      ]),
    ).toBe(true);
  });

  it("rejects non-UI values", () => {
    expect(isUIUpdate(null)).toBe(false);
    expect(isUIUpdate("ui")).toBe(false);
    expect(isUIUpdate({ type: "ui", name: "x" })).toBe(false);
    expect(isUIUpdate({ type: "other", id: "a" })).toBe(false);
    expect(isUIUpdate([{ type: "ui", id: "a", name: "x", props: {} }, 5])).toBe(
      false,
    );
  });

  it("rejects a ui update missing name or props", () => {
    expect(isUIUpdate({ type: "ui", id: "a" })).toBe(false);
    expect(isUIUpdate({ type: "ui", id: "a", name: "x" })).toBe(false);
    expect(isUIUpdate({ type: "ui", id: "a", props: {} })).toBe(false);
    expect(isUIUpdate({ type: "ui", id: "a", name: "x", props: null })).toBe(
      false,
    );
  });

  it("rejects an empty array", () => {
    expect(isUIUpdate([])).toBe(false);
  });
});

describe("applyUIUpdate", () => {
  it("pushes a new UI message", () => {
    expect(applyUIUpdate([], ui("a"))).toEqual([ui("a")]);
  });

  it("replaces an existing UI message by id", () => {
    const result = applyUIUpdate([ui("a", { v: 1 })], ui("a", { v: 2 }));
    expect(result).toEqual([ui("a", { v: 2 })]);
  });

  it("merges props when metadata.merge is true", () => {
    const result = applyUIUpdate([ui("a", { keep: 1, v: 1 })], {
      ...ui("a", { v: 2 }),
      metadata: { merge: true },
    });
    expect(result).toEqual([
      { ...ui("a", { keep: 1, v: 2 }), metadata: { merge: true } },
    ]);
  });

  it("removes a UI message by id", () => {
    const result = applyUIUpdate([ui("a"), ui("b")], {
      type: "remove-ui",
      id: "a",
    });
    expect(result).toEqual([ui("b")]);
  });

  it("applies an array of updates in order", () => {
    const result = applyUIUpdate(
      [ui("a")],
      [ui("b"), { type: "remove-ui", id: "a" }, ui("c")],
    );
    expect(result).toEqual([ui("b"), ui("c")]);
  });

  it("does not mutate the input list", () => {
    const input = [ui("a")];
    applyUIUpdate(input, ui("b"));
    expect(input).toEqual([ui("a")]);
  });
});

describe("extractUIUpdate", () => {
  it("reads a UI update straight from params.data", () => {
    const event = {
      params: { data: { type: "ui", id: "a", name: "x", props: {} } },
    };
    expect(extractUIUpdate(event)).toEqual({
      type: "ui",
      id: "a",
      name: "x",
      props: {},
    });
  });

  it("falls back to params.data.payload when data wraps the update", () => {
    const event = {
      params: { data: { payload: { type: "remove-ui", id: "a" } } },
    };
    expect(extractUIUpdate(event)).toEqual({ type: "remove-ui", id: "a" });
  });

  it("reads an array of updates", () => {
    const event = {
      params: { data: [ui("a"), { type: "remove-ui", id: "b" }] },
    };
    expect(extractUIUpdate(event)).toEqual([
      ui("a"),
      { type: "remove-ui", id: "b" },
    ]);
  });

  it("returns undefined for non-UI custom events and malformed shapes", () => {
    expect(extractUIUpdate({ params: { data: { foo: 1 } } })).toBeUndefined();
    expect(extractUIUpdate({ params: {} })).toBeUndefined();
    expect(extractUIUpdate({})).toBeUndefined();
    expect(extractUIUpdate(null)).toBeUndefined();
  });
});

describe("mergeUIMessages", () => {
  it("returns the snapshot when there are no live messages", () => {
    expect(mergeUIMessages([], [ui("a")])).toEqual([ui("a")]);
  });

  it("returns live messages when the snapshot is not an array", () => {
    expect(mergeUIMessages([ui("a")], undefined)).toEqual([ui("a")]);
  });

  it("lets the snapshot win by id", () => {
    const result = mergeUIMessages([ui("a", { v: 1 })], [ui("a", { v: 2 })]);
    expect(result).toEqual([ui("a", { v: 2 })]);
  });

  it("keeps live and snapshot entries with distinct ids", () => {
    expect(mergeUIMessages([ui("a")], [ui("b")])).toEqual([ui("a"), ui("b")]);
  });
});

describe("foldUIUpdates", () => {
  const evt = (data: unknown) => ({ params: { data } });

  it("folds a sequence of custom events into a UI list", () => {
    expect(foldUIUpdates([evt(ui("a")), evt(ui("b"))])).toEqual([
      ui("a"),
      ui("b"),
    ]);
  });

  it("reads updates nested under params.data.payload", () => {
    expect(foldUIUpdates([evt({ payload: ui("a") })])).toEqual([ui("a")]);
  });

  it("applies a remove across events", () => {
    const result = foldUIUpdates([
      evt(ui("a")),
      evt(ui("b")),
      evt({ type: "remove-ui", id: "a" }),
    ]);
    expect(result).toEqual([ui("b")]);
  });

  it("ignores non-UI custom events", () => {
    const result = foldUIUpdates([evt(ui("a")), evt({ foo: 1 }), evt(ui("b"))]);
    expect(result).toEqual([ui("a"), ui("b")]);
  });

  it("returns an empty list for no events", () => {
    expect(foldUIUpdates([])).toEqual([]);
  });
});
