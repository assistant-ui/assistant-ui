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
    getState = () => createPiThreadState("t-new");
    getProjectedMessages = () => [];
    getMessageRepository = () => ExportedMessageRepository.fromArray([]);
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

const createClient = () => {
  const createThread = vi.fn().mockResolvedValue(snapshot);
  const client = {
    listThreads: vi.fn().mockResolvedValue([]),
    createThread,
    getThread: vi.fn().mockResolvedValue(snapshot),
    subscribe: vi.fn().mockReturnValue(() => {}),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  } as unknown as PiClient;
  return { client, createThread };
};

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

    const createdWithMessage =
      createThread.mock.calls[0]?.[0]?.initialMessage !== undefined;
    const sentViaController = mocks.sendMessage.mock.calls.length > 0;
    expect(createdWithMessage || sentViaController).toBe(true);
  });
});
