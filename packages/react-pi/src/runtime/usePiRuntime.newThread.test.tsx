// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  AssistantRuntimeProvider,
  ExportedMessageRepository,
} from "@assistant-ui/react";
import type { AssistantRuntime } from "@assistant-ui/react";
import type { PiClient, PiThreadSnapshot } from "../types";

const mocks = vi.hoisted(() => ({
  sendMessage: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("./ThreadController", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ThreadController")>();

  class PiThreadController {
    state = createPiThreadState("t-new");
    repository = ExportedMessageRepository.fromArray([]);
    getState = () => this.state;
    getProjectedMessages = () => [];
    getMessageRepository = () => this.repository;
    getVersion = () => 0;
    subscribe = () => () => {};
    subscribeMetadata = () => () => {};
    subscribeMessages = () => () => {};
    connect = () => () => {};
    load = vi.fn().mockResolvedValue(undefined);
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = mocks.sendMessage;
    cancel = vi.fn().mockResolvedValue(undefined);
    clearQueue = vi.fn().mockResolvedValue({ steering: [], followUp: [] });
    setModel = vi.fn().mockResolvedValue(undefined);
    setThinkingLevel = vi.fn().mockResolvedValue(undefined);
    respondToToolApproval = vi.fn().mockResolvedValue(undefined);
    resumeToolCall = vi.fn().mockResolvedValue(undefined);
    respondToHostUiRequest = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
  }

  return { ...original, PiThreadController };
});

import { createPiThreadState } from "./threadState";
import { usePiRuntime } from "./usePiRuntime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const snapshot: PiThreadSnapshot = {
  metadata: { id: "srv-1", status: "idle" },
  messages: [],
} as unknown as PiThreadSnapshot;

const createClient = (
  createThreadImpl: (options?: {
    initialMessage?: unknown;
  }) => Promise<PiThreadSnapshot> = () => Promise.resolve(snapshot),
) => {
  const createThread = vi.fn(createThreadImpl);
  const client = {
    listThreads: vi.fn().mockResolvedValue([]),
    createThread,
    getThread: vi.fn().mockResolvedValue(snapshot),
    subscribe: vi.fn().mockReturnValue(() => {}),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as PiClient;
  return { client, createThread };
};

const sentTexts = () =>
  mocks.sendMessage.mock.calls.map((call) => {
    const content = (call[0] as { content: readonly { text?: string }[] })
      .content;
    return content.map((part) => part.text).join("");
  });

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  vi.clearAllMocks();
});

describe("usePiRuntime new-thread first message", () => {
  it("delivers the first message of a brand-new thread", async () => {
    const { client, createThread } = createClient();
    let runtime!: AssistantRuntime;

    const Harness = () => {
      runtime = usePiRuntime({ client });
      return createElement(AssistantRuntimeProvider, { runtime }, null);
    };

    root = createRoot(document.createElement("div"));
    await act(async () => {
      root!.render(createElement(Harness));
    });
    await act(async () => {});

    await act(async () => {
      await runtime.thread.append("hello pi");
    });
    await act(async () => {});
    await act(async () => {});

    expect(createThread).toHaveBeenCalledTimes(1);
    // The core initializes before onNew runs, so the atomic path cannot see
    // the message; delivery must happen exactly once via the live thread.
    expect(createThread.mock.calls[0]?.[0]?.initialMessage).toBeUndefined();
    expect(mocks.sendMessage).toHaveBeenCalledTimes(1);
    expect(sentTexts()).toEqual(["hello pi"]);
  });

  it("delivers both messages when a second send lands during initialization", async () => {
    let resolveCreate!: (value: PiThreadSnapshot) => void;
    const { client, createThread } = createClient(
      () =>
        new Promise<PiThreadSnapshot>((resolve) => {
          resolveCreate = resolve;
        }),
    );
    let runtime!: AssistantRuntime;

    const Harness = () => {
      runtime = usePiRuntime({ client });
      return createElement(AssistantRuntimeProvider, { runtime }, null);
    };

    root = createRoot(document.createElement("div"));
    await act(async () => {
      root!.render(createElement(Harness));
    });
    await act(async () => {});

    let first!: Promise<void> | void;
    let second!: Promise<void> | void;
    await act(async () => {
      first = runtime.thread.append("message A");
      second = runtime.thread.append("message B");
    });

    await act(async () => {
      resolveCreate(snapshot);
      await Promise.all([first, second]);
    });
    await act(async () => {});

    expect(createThread).toHaveBeenCalledTimes(1);
    expect(createThread.mock.calls[0]?.[0]?.initialMessage).toBeUndefined();
    expect(sentTexts()).toEqual(["message A", "message B"]);
  });
});
