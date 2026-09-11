import { describe, expect, it } from "vitest";
import { AuiConfig, createAssistantClient } from "@assistant-ui/store/client";
import { RuntimeAdapter, Suggestions } from "../index";
import { ExternalStoreRuntimeCore } from "../../runtimes/internal";
import { AssistantRuntimeImpl } from "../../runtime/internal";
import type { ExternalStoreAdapter } from "../../runtimes/external-store/external-store-adapter";

type DemoMessage = { id: string; role: "user" | "assistant"; text: string };

const createClient = () => {
  const adapter: ExternalStoreAdapter<DemoMessage> = {
    messages: [
      { id: "u1", role: "user", text: "hi" },
      { id: "a1", role: "assistant", text: "hello" },
    ],
    convertMessage: (message) => ({
      id: message.id,
      role: message.role,
      content: [{ type: "text", text: message.text }],
    }),
    onNew: async () => {},
    adapters: {
      threadList: {
        threadId: "t1",
        threads: [{ status: "regular", id: "t1", title: "one" }],
        archivedThreads: [{ status: "archived", id: "t2", title: "two" }],
      },
    },
  };
  const runtime = new AssistantRuntimeImpl(
    new ExternalStoreRuntimeCore(adapter),
  );
  return createAssistantClient(
    AuiConfig({
      threads: RuntimeAdapter(runtime),
      suggestions: Suggestions([
        { title: "a", label: "a", prompt: "a" },
        { title: "b", label: "b", prompt: "b" },
      ]),
    }),
  );
};

/**
 * Pins each by-index lookup's valid domain to the state array that backs it.
 * Consumers (the vue by-index providers) guard with `index < array.length`
 * against these arrays; a lookup changing its backing array must fail here.
 */
describe("by-index lookup domains", () => {
  it("thread.message is indexed by thread.getState().messages", () => {
    const handle = createClient();
    const aui = handle.getClient();
    const length = aui.thread.getState().messages.length;
    expect(length).toBe(2);
    expect(aui.thread.message({ index: length - 1 }).getState().id).toBe("a1");
    expect(() => aui.thread.message({ index: length }).getState()).toThrow(
      /out of bounds/,
    );
    handle.destroy();
  });

  it("message.part is indexed by message.getState().parts", () => {
    const handle = createClient();
    const aui = handle.getClient();
    const message = aui.thread.message({ index: 1 });
    const length = message.getState().parts.length;
    expect(length).toBe(1);
    expect(message.part({ index: length - 1 }).getState().type).toBe("text");
    expect(() => message.part({ index: length }).getState()).toThrow(
      /out of bounds/,
    );
    handle.destroy();
  });

  it("suggestions.suggestion is indexed by suggestions.getState().suggestions", () => {
    const handle = createClient();
    const aui = handle.getClient();
    const length = aui.suggestions.getState().suggestions.length;
    expect(length).toBe(2);
    expect(
      aui.suggestions.suggestion({ index: length - 1 }).getState().title,
    ).toBe("b");
    expect(() =>
      aui.suggestions.suggestion({ index: length }).getState(),
    ).toThrow(/out of bounds/);
    handle.destroy();
  });

  it("threads.item is indexed by threadIds and archivedThreadIds", () => {
    const handle = createClient();
    const aui = handle.getClient();
    const state = aui.threads.getState();
    expect(state.threadIds).toHaveLength(1);
    expect(state.archivedThreadIds).toHaveLength(1);
    expect(aui.threads.item({ index: 0, archived: false }).getState().id).toBe(
      "t1",
    );
    expect(aui.threads.item({ index: 0, archived: true }).getState().id).toBe(
      "t2",
    );
    expect(() =>
      aui.threads.item({ index: 1, archived: false }).getState(),
    ).toThrow(/not found|out of bounds/);
    expect(() =>
      aui.threads.item({ index: 1, archived: true }).getState(),
    ).toThrow(/not found|out of bounds/);
    handle.destroy();
  });
});
