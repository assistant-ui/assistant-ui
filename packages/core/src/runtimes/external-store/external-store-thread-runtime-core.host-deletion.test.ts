import { describe, expect, it, vi } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../types/message";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const messages = ExportedMessageRepository.fromArray([
  { id: "u1", role: "user", content: "first" },
  { id: "a1", role: "assistant", content: "first reply" },
  { id: "u2", role: "user", content: "second" },
  { id: "a2", role: "assistant", content: "second reply" },
  { id: "u3", role: "user", content: "third" },
  { id: "a3", role: "assistant", content: "third reply" },
]).messages.map(({ message }) => message);

const replacement = ExportedMessageRepository.fromArray([
  { id: "a1b", role: "assistant", content: "replacement" },
]).messages[0]!.message;

const adapter = (items: readonly ThreadMessage[]) =>
  ({
    messages: items,
    onNew: async () => {},
    adapters: { feedback: { submit: vi.fn() } },
  }) as ExternalStoreAdapter;

const createRuntime = (items: readonly ThreadMessage[]) =>
  new ExternalStoreThreadRuntimeCore(contextProvider, adapter(items));

const exportedIds = (runtime: ExternalStoreThreadRuntimeCore) =>
  runtime.export().messages.map(({ message }) => message.id);

describe("external-store host deletions from the middle of a message array", () => {
  it("evicts a dropped message and its feedback", () => {
    const initial = messages.slice(0, 4);
    const runtime = createRuntime(initial);
    runtime.submitFeedback({ messageId: "a1", type: "positive" });

    runtime.__internal_setAdapter(adapter([initial[0]!, ...initial.slice(2)]));

    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    expect(exportedIds(runtime)).toEqual(["u1", "u2", "a2"]);
    expect(runtime.getMessageById("a1")).toBeUndefined();

    runtime.__internal_setAdapter(adapter(initial));
    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toBeUndefined();
  });

  it("evicts both messages skipped by a deeper relink", () => {
    const runtime = createRuntime(messages);

    runtime.__internal_setAdapter(
      adapter([messages[0]!, messages[1]!, messages[4]!, messages[5]!]),
    );

    expect(runtime.getBranches("u3")).toEqual(["u3"]);
    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u3", "a3"]);
    expect(runtime.getMessageById("u2")).toBeUndefined();
    expect(runtime.getMessageById("a2")).toBeUndefined();
  });

  it("keeps a replaced message as a sibling", () => {
    const runtime = createRuntime(messages.slice(0, 4));

    runtime.__internal_setAdapter(
      adapter([messages[0]!, replacement, messages[2]!, messages[3]!]),
    );

    expect(runtime.getBranches("a1b")).toEqual(["a1", "a1b"]);
    expect(exportedIds(runtime)).toContain("a1");
  });

  it("keeps messages when the host republishes the same path", () => {
    const initial = messages.slice(0, 4);
    const runtime = createRuntime(initial);

    runtime.__internal_setAdapter(adapter([...initial]));

    expect(exportedIds(runtime)).toEqual(["u1", "a1", "u2", "a2"]);
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
  });
});
