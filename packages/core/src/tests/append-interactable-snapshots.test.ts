import { describe, expect, it, vi } from "vitest";
import { ExternalStoreRuntimeCore } from "../runtimes/external-store/external-store-runtime-core";
import { LocalRuntimeCore } from "../runtimes/local/local-runtime-core";
import type { ChatModelAdapter } from "../runtime/utils/chat-model-adapter";
import type { AppendMessage, ThreadMessage } from "../types/message";

const live = (state: unknown) => ({
  interactables: [{ id: "n1", name: "note", state }],
});

const snapshotMessage = (id: string, state: unknown) =>
  ({
    id,
    role: "user",
    createdAt: new Date(),
    content: [{ type: "text", text: "old" }],
    attachments: [],
    metadata: {
      custom: { interactables: [{ id: "n1", name: "note", state }] },
    },
  }) as ThreadMessage;

const userMessage = (text: string, parentId: string | null): AppendMessage => ({
  parentId,
  sourceId: null,
  runConfig: {},
  role: "user",
  content: [{ type: "text", text }],
  attachments: [],
  metadata: { custom: {} },
  createdAt: new Date(),
});

const externalThread = (options?: {
  messages?: ThreadMessage[];
  composerMetadata?: Record<string, unknown>;
}) => {
  const onNew = vi.fn(async () => {});
  const onEdit = vi.fn(async () => {});
  const core = new ExternalStoreRuntimeCore({
    messages: options?.messages ?? [],
    onNew,
    onEdit,
  });
  if (options?.composerMetadata) {
    core.registerModelContextProvider({
      getModelContext: () => ({
        unstable_composerMetadata: options.composerMetadata,
      }),
    });
  }
  return { thread: core.threads.getMainThreadRuntimeCore(), onNew, onEdit };
};

const appendedSnapshots = (sink: ReturnType<typeof vi.fn>) =>
  (sink.mock.calls[0]![0] as AppendMessage).metadata?.custom?.interactables;

const tailId = (messages: ThreadMessage[]) => messages.at(-1)?.id ?? null;

describe("interactable snapshots on the append seam", () => {
  it("stamps a baseline on the first send of the thread", async () => {
    const { thread, onNew } = externalThread({
      composerMetadata: live({ v: 1 }),
    });
    await thread.append(userMessage("hello", null));
    expect(appendedSnapshots(onNew)).toEqual([
      { id: "n1", name: "note", state: { v: 1 } },
    ]);
  });

  it("stamps nothing when the history already carries the live state", async () => {
    const messages = [snapshotMessage("msg-1", { v: 1 })];
    const { thread, onNew } = externalThread({
      messages,
      composerMetadata: live({ v: 1 }),
    });
    await thread.append(userMessage("hello", tailId(messages)));
    expect(appendedSnapshots(onNew)).toBeUndefined();
  });

  it("stamps the new state when it diverged from the latest snapshot", async () => {
    const messages = [snapshotMessage("msg-1", { v: 1 })];
    const { thread, onNew } = externalThread({
      messages,
      composerMetadata: live({ v: 2 }),
    });
    await thread.append(userMessage("hello", tailId(messages)));
    expect(appendedSnapshots(onNew)).toEqual([
      { id: "n1", name: "note", state: { v: 2 } },
    ]);
  });

  it("stamps a programmatic append, the path suggestions and thread.append() take", async () => {
    const { thread, onNew } = externalThread({
      composerMetadata: live({ tasks: [] }),
    });
    // No composer involved: this is what useSuggestionTrigger issues.
    await thread.append(userMessage("Add 3 tasks for a grocery run", null));
    expect(appendedSnapshots(onNew)).toEqual([
      { id: "n1", name: "note", state: { tasks: [] } },
    ]);
  });

  it("leaves a non-user append unstamped, since no reader folds those", async () => {
    const { thread, onNew } = externalThread({
      composerMetadata: live({ v: 1 }),
    });
    await thread.append({
      ...userMessage("an assistant turn", null),
      role: "assistant",
    } as AppendMessage);
    expect(appendedSnapshots(onNew)).toBeUndefined();
  });

  it("re-stamps the baseline when the edited message carried the only snapshot", async () => {
    const messages = [snapshotMessage("msg-1", { v: 1 })];
    const { thread, onEdit } = externalThread({
      messages,
      composerMetadata: live({ v: 1 }),
    });
    // An edit branches off the edited message's parent, so the prefix it is
    // gated against excludes the edited message and its snapshot.
    await thread.append({ ...userMessage("new", null), sourceId: "msg-1" });
    expect(appendedSnapshots(onEdit)).toEqual([
      { id: "n1", name: "note", state: { v: 1 } },
    ]);
  });

  it("stamps nothing when the edit's branch prefix already carries the live state", async () => {
    const messages = [
      snapshotMessage("parent-1", { v: 1 }),
      snapshotMessage("msg-1", { v: 1 }),
    ];
    const { thread, onEdit } = externalThread({
      messages,
      composerMetadata: live({ v: 1 }),
    });
    await thread.append({
      ...userMessage("new", "parent-1"),
      sourceId: "msg-1",
    });
    expect(appendedSnapshots(onEdit)).toBeUndefined();
  });

  it("stamps on the local runtime core too", async () => {
    const run = vi.fn(async function* () {
      yield { content: [{ type: "text" as const, text: "ok" }] };
    } as unknown as ChatModelAdapter["run"]);
    const core = new LocalRuntimeCore(
      { adapters: { chatModel: { run } } },
      undefined,
    );
    core.registerModelContextProvider({
      getModelContext: () => ({
        unstable_composerMetadata: live({ v: 1 }),
      }),
    });
    const thread = core.threads.getMainThreadRuntimeCore();
    await thread.append(userMessage("hello", null));
    expect(thread.messages[0]!.metadata.custom?.interactables).toEqual([
      { id: "n1", name: "note", state: { v: 1 } },
    ]);
  });
});
