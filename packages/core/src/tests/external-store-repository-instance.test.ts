import { describe, it, expect, vi } from "vitest";
import { ExternalStoreThreadRuntimeCore } from "../runtimes/external-store/external-store-thread-runtime-core";
import type { ExternalStoreAdapter } from "../runtimes/external-store/external-store-adapter";
import type { ModelContextProvider } from "../model-context/types";
import type { ThreadMessage } from "../types/message";
import { MessageRepository } from "../runtime/utils/message-repository";

const createContextProvider = (): ModelContextProvider => ({
  getModelContext: () => ({}),
});

const createUserMessage = (id: string, text = "Hello"): ThreadMessage =>
  ({
    id,
    role: "user" as const,
    createdAt: new Date(),
    content: [{ type: "text" as const, text }],
    attachments: [],
    metadata: {
      custom: {},
    },
  }) as ThreadMessage;

const createAssistantMessage = (id: string, text = "Hi there"): ThreadMessage =>
  ({
    id,
    role: "assistant" as const,
    createdAt: new Date(),
    content: [{ type: "text" as const, text }],
    status: { type: "complete" as const, reason: "stop" as const },
    metadata: {
      unstable_state: null,
      unstable_annotations: [],
      unstable_data: [],
      steps: [],
      custom: {},
    },
  }) as ThreadMessage;

const createAdapter = (
  messages: readonly ThreadMessage[],
  repository: MessageRepository,
): ExternalStoreAdapter<ThreadMessage> => ({
  messages,
  onNew: vi.fn(async () => {}),
  unstable_messageRepositoryInstance: repository,
});

describe("ExternalStoreThreadRuntimeCore repository instance swap", () => {
  it("keeps each conversation's history in its own repository across swaps", () => {
    const repoA = new MessageRepository();
    const repoB = new MessageRepository();
    const threadA = [
      createUserMessage("a-u1", "thread a question"),
      createAssistantMessage("a-m1", "thread a answer"),
    ];
    const threadB = [
      createUserMessage("b-u1", "thread b question"),
      createAssistantMessage("b-m1", "thread b answer"),
    ];

    const core = new ExternalStoreThreadRuntimeCore(
      createContextProvider(),
      createAdapter(threadA, repoA),
    );
    expect(core.messages.map((m) => m.id)).toEqual(["a-u1", "a-m1"]);

    core.__internal_setAdapter(createAdapter(threadB, repoB));
    expect(core.messages.map((m) => m.id)).toEqual(["b-u1", "b-m1"]);
    expect(core.getBranches("b-u1")).toEqual(["b-u1"]);

    core.__internal_setAdapter(createAdapter(threadA, repoA));
    expect(core.messages.map((m) => m.id)).toEqual(["a-u1", "a-m1"]);
    expect(core.getBranches("a-u1")).toEqual(["a-u1"]);
    expect(repoB.getMessages().map((m) => m.id)).toEqual(["b-u1", "b-m1"]);
  });

  it("preserves intra-thread branches across a swap through an empty conversation", () => {
    const repoA = new MessageRepository();
    const repoB = new MessageRepository();
    const original = [
      createUserMessage("a-u1"),
      createAssistantMessage("a-m1"),
    ];
    const edited = [
      createUserMessage("a-u2", "edited question"),
      createAssistantMessage("a-m2", "edited answer"),
    ];

    const core = new ExternalStoreThreadRuntimeCore(
      createContextProvider(),
      createAdapter(original, repoA),
    );
    repoA.addOrUpdateMessage(null, edited[0]!);
    repoA.addOrUpdateMessage("a-u2", edited[1]!);
    core.__internal_setAdapter(createAdapter(edited, repoA));
    expect(core.getBranches("a-u2")).toEqual(["a-u1", "a-u2"]);

    core.__internal_setAdapter(createAdapter([], repoB));
    expect(core.messages).toHaveLength(0);

    core.__internal_setAdapter(createAdapter(edited, repoA));
    expect(core.messages.map((m) => m.id)).toEqual(["a-u2", "a-m2"]);
    expect(core.getBranches("a-u2")).toEqual(["a-u1", "a-u2"]);
  });

  it("does not adopt anything when the instance is omitted", () => {
    const messages = [createUserMessage("u1")];
    const core = new ExternalStoreThreadRuntimeCore(createContextProvider(), {
      messages,
      onNew: vi.fn(async () => {}),
    });
    expect(core.messages.map((m) => m.id)).toEqual(["u1"]);

    const next = [createUserMessage("u1"), createAssistantMessage("m1")];
    core.__internal_setAdapter({
      messages: next,
      onNew: vi.fn(async () => {}),
    });
    expect(core.messages.map((m) => m.id)).toEqual(["u1", "m1"]);
  });

  it("reconciles a same-reference messages array when only the repository swapped", () => {
    const repoA = new MessageRepository();
    const repoB = new MessageRepository();
    const shared = [createUserMessage("s-u1")];

    const core = new ExternalStoreThreadRuntimeCore(
      createContextProvider(),
      createAdapter(shared, repoA),
    );
    expect(repoA.getMessages().map((m) => m.id)).toEqual(["s-u1"]);
    expect(repoB.getMessages()).toHaveLength(0);

    core.__internal_setAdapter(createAdapter(shared, repoB));
    expect(repoB.getMessages().map((m) => m.id)).toEqual(["s-u1"]);
    expect(core.messages.map((m) => m.id)).toEqual(["s-u1"]);
  });

  it("re-imports a same-reference repository snapshot when the instance swapped", () => {
    const repoA = new MessageRepository();
    const repoB = new MessageRepository();
    const snapshot = {
      headId: "s-m1",
      messages: [
        { parentId: null, message: createUserMessage("s-u1") },
        { parentId: "s-u1", message: createAssistantMessage("s-m1") },
      ],
    };

    const core = new ExternalStoreThreadRuntimeCore(createContextProvider(), {
      messageRepository: snapshot,
      onNew: vi.fn(async () => {}),
      unstable_messageRepositoryInstance: repoA,
    });
    expect(core.messages.map((m) => m.id)).toEqual(["s-u1", "s-m1"]);

    core.__internal_setAdapter({
      messageRepository: snapshot,
      onNew: vi.fn(async () => {}),
      unstable_messageRepositoryInstance: repoB,
    });
    expect(core.messages.map((m) => m.id)).toEqual(["s-u1", "s-m1"]);
    expect(repoB.getMessages().map((m) => m.id)).toEqual(["s-u1", "s-m1"]);
  });
});
