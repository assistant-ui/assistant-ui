import { describe, expect, it } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

describe("ExternalStoreThreadRuntimeCore import", () => {
  it("publishes imported messages before notifying subscribers", () => {
    const oldMessages = ExportedMessageRepository.fromArray([
      { id: "a1", role: "user", content: "question" },
      { id: "a2", role: "assistant", content: "answer" },
    ]).messages.map(({ message }) => message);
    const runtime = new ExternalStoreThreadRuntimeCore(contextProvider, {
      messages: oldMessages,
      onNew: async () => {},
      onImport: () => {},
    } as ExternalStoreAdapter);

    let listedIds: string[] = [];
    let unresolvedIds: string[] = [];
    runtime.subscribe(() => {
      listedIds = runtime.messages.map(({ id }) => id);
      unresolvedIds = listedIds.filter(
        (id) => runtime.getMessageById(id) === undefined,
      );
    });

    runtime.import(
      ExportedMessageRepository.fromArray([
        { id: "x1", role: "user", content: "replacement" },
      ]),
    );

    expect(listedIds).toEqual(["x1"]);
    expect(unresolvedIds).toEqual([]);
    expect(runtime.messages.map(({ id }) => id)).toEqual(["x1"]);
  });
});

describe("ExternalStoreThreadRuntimeCore import that cannot be placed", () => {
  type Source = { id: string; role: "user" | "assistant"; text: string };
  const sources: Source[] = [
    { id: "u1", role: "user", text: "hi" },
    { id: "a1", role: "assistant", text: "hello" },
  ];
  const createStore = (messages: readonly Source[]) =>
    ({
      messages,
      convertMessage: (message: Source) => ({
        id: message.id,
        role: message.role,
        content: [{ type: "text", text: message.text }],
      }),
      onNew: async () => {},
      onImport: () => {},
      adapters: { feedback: { submit: () => {} } },
    }) as unknown as ExternalStoreAdapter<any>;

  it("keeps submitted feedback applied when the host supplies a new array", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      createStore(sources),
    );
    runtime.submitFeedback({ messageId: "a1", type: "positive" });

    expect(() =>
      runtime.import({
        headId: "missing",
        messages: [
          {
            parentId: null,
            message: runtime.getMessageById("u1")!.message,
          },
        ],
      }),
    ).toThrow();
    runtime.__internal_setAdapter(createStore([...sources]));

    expect(
      runtime.getMessageById("a1")?.message.metadata.submittedFeedback,
    ).toEqual({ type: "positive" });
  });
});
