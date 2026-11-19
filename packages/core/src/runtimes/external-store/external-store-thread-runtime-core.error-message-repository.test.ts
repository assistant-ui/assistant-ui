import { describe, expect, it } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { completeExternalMessageConversion } from "../../runtime/utils/external-message-conversion";
import {
  ExportedMessageRepository,
  MessageRepository,
} from "../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../types/message";
import { isErrorMessageId } from "../../utils/id";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const [u1, a1, u2, a2] = ExportedMessageRepository.fromArray([
  { id: "u1", role: "user", content: "first" },
  { id: "a1", role: "assistant", content: "first reply" },
  { id: "u2", role: "user", content: "second" },
  { id: "a2", role: "assistant", content: "second reply" },
]).messages.map(({ message }) => message) as [
  ThreadMessage,
  ThreadMessage,
  ThreadMessage,
  ThreadMessage,
];

const adapter = (
  messages: readonly ThreadMessage[],
  options: {
    error?: string;
    isRunning?: boolean;
    repository?: MessageRepository;
  } = {},
) =>
  ({
    messages: completeExternalMessageConversion([...messages], options.error),
    isRunning: options.isRunning ?? false,
    unstable_messageRepositoryInstance: options.repository,
    onNew: async () => {},
    onReload: async () => {},
  }) as ExternalStoreAdapter;

const errorIds = (runtime: ExternalStoreThreadRuntimeCore) =>
  runtime
    .export()
    .messages.map(({ message }) => message.id)
    .filter(isErrorMessageId);

describe("a runtime core created over a repository another core wrote to", () => {
  it("evicts the error message the previous core synthesized", () => {
    const repository = new MessageRepository();
    const first = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502", repository }),
    );
    const errorId = first.messages.at(-1)!.id;
    expect(isErrorMessageId(errorId)).toBe(true);
    expect(repository.getMessages().map(({ id }) => id)).toContain(errorId);

    // A new core over the same repository, publishing a snapshot that no
    // longer carries the error: the stale message is the previous core's.
    const second = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1, a1], { repository }),
    );

    expect(errorIds(second)).toEqual([]);
    expect(second.messages.map(({ id }) => id)).toEqual(["u1", "a1"]);
    expect(second.getBranches("a1")).toEqual(["a1"]);
  });

  it("evicts the previous core's error and keeps the new snapshot's error", () => {
    const repository = new MessageRepository();
    new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502", repository }),
    );
    const error = repository.getMessages().at(-1)!;
    expect(isErrorMessageId(error.id)).toBe(true);

    const next = adapter([u1], { repository, error: "502" });
    const newErrorId = next.messages!.at(-1)!.id;
    expect(newErrorId).not.toBe(error.id);
    const second = new ExternalStoreThreadRuntimeCore(contextProvider, next);

    expect(errorIds(second)).not.toContain(error.id);
    expect(errorIds(second)).toEqual([newErrorId]);
  });

  it("keeps a repository error the host built further turns on", () => {
    const repository = new MessageRepository();
    const first = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502", repository }),
    );
    const error = first.messages.at(-1)!;
    expect(isErrorMessageId(error.id)).toBe(true);

    // u2 was sent on top of the error the host kept, so that branch is the
    // host's, not a leftover.
    const second = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1, error, u2, a2], { repository }),
    );

    expect(errorIds(second)).toEqual([error.id]);
  });
});
