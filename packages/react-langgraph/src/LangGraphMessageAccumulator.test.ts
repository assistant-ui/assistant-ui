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

describe("LangGraphMessageAccumulator reconcileMessages", () => {
  it("updates message content from server snapshot", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([{ id: "ai-1", type: "ai", content: "Streaming partial" }]);
    const result = acc.reconcileMessages([
      { id: "ai-1", type: "ai", content: "Final server content" },
    ]);
    const ai1 = result.find((m) => m.id === "ai-1");
    expect(ai1!.content).toBe("Final server content");
  });

  it("preserves accumulator-only messages not in server snapshot", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([
      { id: "ai-1", type: "ai", content: "Parent msg" },
      { id: "sub-ai-1", type: "ai", content: "Subgraph msg" },
    ]);
    const result = acc.reconcileMessages([
      { id: "ai-1", type: "ai", content: "Parent updated" },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.id === "ai-1")!.content).toBe("Parent updated");
    expect(result.find((m) => m.id === "sub-ai-1")!.content).toBe(
      "Subgraph msg",
    );
  });

  it("preserves metadata for all surviving messages", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessageWithMetadata(
      { id: "ai-1", type: "ai", content: "Hello" },
      { langgraph_node: "agent", ls_model_name: "claude-3-7-sonnet-latest" },
    );
    acc.addMessageWithMetadata(
      { id: "sub-ai-1", type: "ai", content: "Sub" },
      { langgraph_node: "sub_agent" },
    );
    acc.reconcileMessages([{ id: "ai-1", type: "ai", content: "Hello world" }]);
    const metadata = acc.getMetadataMap();
    expect(metadata.get("ai-1")).toEqual({
      langgraph_node: "agent",
      ls_model_name: "claude-3-7-sonnet-latest",
    });
    // Subgraph message metadata preserved since the message still exists
    expect(metadata.get("sub-ai-1")).toEqual({ langgraph_node: "sub_agent" });
  });

  it("adds new messages from server snapshot", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([{ id: "ai-1", type: "ai", content: "Hello" }]);
    const result = acc.reconcileMessages([
      { id: "ai-1", type: "ai", content: "Hello updated" },
      { id: "ai-2", type: "ai", content: "New from server" },
    ]);
    expect(result).toHaveLength(2);
    expect(result.find((m) => m.id === "ai-2")!.content).toBe(
      "New from server",
    );
  });

  it("returns a fresh array reference", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([{ id: "ai-1", type: "ai", content: "A" }]);
    const result = acc.reconcileMessages([
      { id: "ai-1", type: "ai", content: "B" },
    ]);
    result.push({ id: "fake", type: "ai", content: "injected" });
    expect(acc.getMessages()).toHaveLength(1);
  });

  it("preserves insertion order when updating existing messages", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([
      { id: "user-1", type: "human", content: "hi" },
      { id: "ai-1", type: "ai", content: "partial" },
      { id: "tool-1", type: "tool", content: "result", tool_call_id: "tc-1" },
    ]);
    const result = acc.reconcileMessages([
      { id: "user-1", type: "human", content: "hi" },
      { id: "ai-1", type: "ai", content: "final" },
    ]);
    expect(result.map((m) => m.id)).toEqual(["user-1", "ai-1", "tool-1"]);
  });

  it("handles empty server snapshot by preserving all accumulator state", () => {
    const acc = new LangGraphMessageAccumulator<LangChainMessage>();
    acc.addMessages([{ id: "ai-1", type: "ai", content: "preserved" }]);
    const result = acc.reconcileMessages([]);
    expect(result).toHaveLength(1);
    expect(result[0]!.id).toBe("ai-1");
  });
});
