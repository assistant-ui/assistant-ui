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
