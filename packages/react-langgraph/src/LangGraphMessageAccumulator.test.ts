import { describe, expect, it } from "vitest";

import { LangGraphMessageAccumulator } from "./LangGraphMessageAccumulator";
import type { LangChainMessage, UIMessage } from "./types";

const makeUIMessage = (
  id: string,
  name: string,
  props: Record<string, unknown> = {},
  extra?: NonNullable<UIMessage["metadata"]>,
): UIMessage => ({
  type: "ui",
  id,
  name,
  props,
  ...(extra !== undefined && { metadata: extra }),
});

describe("LangGraphMessageAccumulator UI reducer", () => {
  it("appends new UI messages by id", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { value: 1 }));
    acc.applyUIUpdate(makeUIMessage("ui-2", "table", { rows: [] }));

    expect(acc.getUIMessages()).toHaveLength(2);
    expect(acc.getUIMessages()[0]!.id).toBe("ui-1");
    expect(acc.getUIMessages()[1]!.name).toBe("table");
  });

  it("replaces an existing UI message when merge is not set", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { a: 1, b: 2 }));
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { c: 3 }));

    expect(acc.getUIMessages()).toHaveLength(1);
    expect(acc.getUIMessages()[0]!.props).toEqual({ c: 3 });
  });

  it("shallow-merges props when metadata.merge is true", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { a: 1, b: 2 }));
    acc.applyUIUpdate(
      makeUIMessage("ui-1", "chart", { b: 99, c: 3 }, { merge: true }),
    );

    expect(acc.getUIMessages()).toHaveLength(1);
    expect(acc.getUIMessages()[0]!.props).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("removes a UI message on remove-ui", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart"));
    acc.applyUIUpdate(makeUIMessage("ui-2", "table"));
    acc.applyUIUpdate({ type: "remove-ui", id: "ui-1" });

    expect(acc.getUIMessages().map((u) => u.id)).toEqual(["ui-2"]);
  });

  it("returns a new array reference on every mutation", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    const a = acc.getUIMessages();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart"));
    const b = acc.getUIMessages();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { x: 1 }));
    const c = acc.getUIMessages();
    acc.applyUIUpdate({ type: "remove-ui", id: "ui-1" });
    const d = acc.getUIMessages();

    expect(a).not.toBe(b);
    expect(b).not.toBe(c);
    expect(c).not.toBe(d);
  });

  it("replaces UI messages wholesale via replaceUIMessages", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart"));
    const next = [makeUIMessage("ui-2", "table"), makeUIMessage("ui-3", "map")];
    acc.replaceUIMessages(next);

    expect(acc.getUIMessages().map((u) => u.id)).toEqual(["ui-2", "ui-3"]);
  });

  it("persists initial UI messages passed via the constructor", () => {
    const initial = [makeUIMessage("ui-1", "chart")];
    const acc = new LangGraphMessageAccumulator<LangChainMessage>({
      initialUIMessages: initial,
    });

    expect(acc.getUIMessages()).toEqual(initial);
    // defensive copy
    initial.push(makeUIMessage("ui-2", "table"));
    expect(acc.getUIMessages()).toHaveLength(1);
  });

  it("clear() drops both messages and UI state", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([{ id: "m-1", type: "ai", content: "hi" }]);
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart"));
    acc.clear();

    expect(acc.getMessages()).toHaveLength(0);
    expect(acc.getUIMessages()).toHaveLength(0);
  });

  it("accepts an array of updates, mirroring upstream reducer", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate([
      makeUIMessage("ui-1", "chart", { a: 1 }),
      makeUIMessage("ui-2", "table", { rows: 10 }),
      { type: "remove-ui", id: "ui-1" },
    ]);

    expect(acc.getUIMessages().map((u) => u.id)).toEqual(["ui-2"]);
  });

  it("merges batch updates forward against the running state", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { a: 1, b: 2 }));

    acc.applyUIUpdate([
      makeUIMessage("ui-1", "chart", { b: 99 }, { merge: true }),
      makeUIMessage("ui-1", "chart", { c: 3 }, { merge: true }),
    ]);

    expect(acc.getUIMessages()).toHaveLength(1);
    expect(acc.getUIMessages()[0]!.props).toEqual({ a: 1, b: 99, c: 3 });
  });

  it("handles batch remove + later-element update without index aliasing", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate([
      makeUIMessage("ui-1", "chart", { v: 1 }),
      makeUIMessage("ui-2", "table", { rows: 10 }),
    ]);

    acc.applyUIUpdate([
      { type: "remove-ui", id: "ui-1" },
      makeUIMessage("ui-2", "table", { rows: 999 }),
    ]);

    expect(acc.getUIMessages()).toHaveLength(1);
    expect(acc.getUIMessages()[0]!.id).toEqual("ui-2");
    expect(acc.getUIMessages()[0]!.props).toEqual({ rows: 999 });
  });

  it("treats non-object metadata as non-merge", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart", { a: 1 }));
    // Cast — runtime payloads from the wire could be malformed.
    acc.applyUIUpdate({
      type: "ui",
      id: "ui-1",
      name: "chart",
      props: { b: 2 },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      metadata: "bogus" as any,
    });

    expect(acc.getUIMessages()[0]!.props).toEqual({ b: 2 });
  });

  it("returns defensive copies that cannot corrupt internal state", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();

    // getUIMessages returns a copy
    acc.applyUIUpdate(makeUIMessage("ui-1", "chart"));
    const fromGetter = acc.getUIMessages();
    fromGetter.push(makeUIMessage("fake-1", "table"));
    expect(acc.getUIMessages()).toHaveLength(1);

    // applyUIUpdate return is a copy
    const fromApply = acc.applyUIUpdate(makeUIMessage("ui-2", "chart"));
    fromApply.push(makeUIMessage("fake-2", "table"));
    expect(acc.getUIMessages()).toHaveLength(2);

    // replaceUIMessages return is a copy
    const fromReplace = acc.replaceUIMessages([makeUIMessage("ui-3", "chart")]);
    fromReplace.push(makeUIMessage("fake-3", "table"));
    expect(acc.getUIMessages()).toHaveLength(1);
    expect(acc.getUIMessages()[0]!.id).toBe("ui-3");
  });
});
