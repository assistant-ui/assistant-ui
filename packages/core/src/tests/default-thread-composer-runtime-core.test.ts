import { describe, expect, it, vi } from "vitest";
import { DefaultThreadComposerRuntimeCore } from "../runtime/base/default-thread-composer-runtime-core";
import type { ThreadRuntimeCore } from "../runtime/interfaces/thread-runtime-core";
import type { AppendMessage, ThreadMessage } from "../types/message";

const makeRuntime = (options?: {
  messages?: ThreadMessage[];
  composerMetadata?: Record<string, unknown>;
}) => {
  const append = vi.fn();
  const runtime = {
    append,
    getModelContext: () => ({
      ...(options?.composerMetadata
        ? { unstable_composerMetadata: options.composerMetadata }
        : {}),
    }),
    subscribe: () => () => {},
    capabilities: { cancel: false },
    messages: options?.messages ?? [],
    isSendDisabled: false,
    composer: { runConfig: {} },
  } as unknown as Omit<ThreadRuntimeCore, "composer">;
  return { runtime, append };
};

const snapshotMessage = (id: string, state: unknown): ThreadMessage =>
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

const live = (state: unknown) => ({
  interactables: [{ id: "n1", name: "note", state }],
});

const send = async (runtime: Omit<ThreadRuntimeCore, "composer">) => {
  const composer = new DefaultThreadComposerRuntimeCore(runtime);
  composer.setText("hello");
  await composer.send();
};

describe("DefaultThreadComposerRuntimeCore interactables snapshot gating", () => {
  it("stamps a baseline on the first send of the thread", async () => {
    const { runtime, append } = makeRuntime({
      composerMetadata: live({ v: 1 }),
    });
    await send(runtime);
    const appended = append.mock.calls[0]![0] as AppendMessage;
    expect(appended.metadata?.custom?.interactables).toEqual([
      { id: "n1", name: "note", state: { v: 1 } },
    ]);
  });

  it("stamps nothing when the history already carries the live state", async () => {
    const { runtime, append } = makeRuntime({
      messages: [snapshotMessage("msg-1", { v: 1 })],
      composerMetadata: live({ v: 1 }),
    });
    await send(runtime);
    const appended = append.mock.calls[0]![0] as AppendMessage;
    expect(appended.metadata?.custom?.interactables).toBeUndefined();
  });

  it("stamps the new state when it diverged from the latest snapshot", async () => {
    const { runtime, append } = makeRuntime({
      messages: [snapshotMessage("msg-1", { v: 1 })],
      composerMetadata: live({ v: 2 }),
    });
    await send(runtime);
    const appended = append.mock.calls[0]![0] as AppendMessage;
    expect(appended.metadata?.custom?.interactables).toEqual([
      { id: "n1", name: "note", state: { v: 2 } },
    ]);
  });
});
