import { describe, expect, it, vi } from "vitest";
import { ReadonlyThreadRuntimeCore } from "./ReadonlyThreadRuntimeCore";
import { BaseSubscribable } from "../../subscribable/subscribable";
import type { ThreadMessage } from "../../types/message";

const message = (id: string) =>
  ({
    id,
    role: "assistant",
    content: [],
    createdAt: new Date(),
    status: { type: "complete", reason: "stop" },
    metadata: {
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as unknown as ThreadMessage;

describe("ReadonlyThreadRuntimeCore", () => {
  it("is constructable and subscribable", () => {
    const core = new ReadonlyThreadRuntimeCore();
    expect(core).toBeInstanceOf(BaseSubscribable);

    const callback = vi.fn();
    const unsubscribe = core.subscribe(callback);
    core.setMessages([message("a")]);
    expect(callback).toHaveBeenCalledTimes(1);

    unsubscribe();
    core.setMessages([message("b")]);
    expect(callback).toHaveBeenCalledTimes(1);
  });

  it("does not notify when setMessages is handed the same reference", () => {
    const core = new ReadonlyThreadRuntimeCore();
    const messages = [message("a")];
    core.setMessages(messages);

    const callback = vi.fn();
    core.subscribe(callback);
    core.setMessages(messages);
    expect(callback).not.toHaveBeenCalled();
  });

  it("reads messages, branches, and the export repository out of setMessages", () => {
    const core = new ReadonlyThreadRuntimeCore();
    core.setMessages([message("a"), message("b")]);

    expect(core.messages.map((m) => m.id)).toEqual(["a", "b"]);
    expect(core.getMessageById("b")).toMatchObject({ parentId: "a", index: 1 });
    expect(core.getMessageById("missing")).toBeUndefined();
    expect(core.getBranches("b")).toEqual(["b"]);
    expect(core.getBranches("missing")).toEqual([]);
    expect(core.export().messages).toEqual([
      { message: expect.objectContaining({ id: "a" }), parentId: null },
      { message: expect.objectContaining({ id: "b" }), parentId: "a" },
    ]);
  });
});
