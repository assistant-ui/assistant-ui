// @vitest-environment jsdom

import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AppendMessage, ExternalStoreAdapter } from "@assistant-ui/react";
import type { PiClient } from "../types";

const mocks = vi.hoisted(() => ({
  adapters: [] as ExternalStoreAdapter[],
  repository: undefined as unknown,
  state: undefined as unknown,
  controller: {
    load: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({
    threadListItem: { initialize: vi.fn().mockResolvedValue(undefined) },
  }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      threadListItem: {
        id: "t1",
        remoteId: "t1",
        externalId: "t1",
        status: "regular",
      },
      threads: { mainThreadId: "t1" },
    }),
  useExternalStoreRuntime: (adapter: ExternalStoreAdapter) => {
    mocks.adapters.push(adapter);
    return {};
  },
  useRemoteThreadListRuntime: (options: { runtimeHook: () => unknown }) =>
    options.runtimeHook(),
}));

vi.mock("./ThreadController", async (importOriginal) => {
  const original = await importOriginal<typeof import("./ThreadController")>();

  class PiThreadController {
    getState = () => mocks.state;
    getProjectedMessages = () => [];
    getMessageRepository = () => mocks.repository;
    getVersion = () => 0;
    subscribe = () => () => {};
    subscribeMetadata = () => () => {};
    subscribeMessages = () => () => {};
    connect = () => () => {};
    load = mocks.controller.load;
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = mocks.controller.sendMessage;
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

import { ExportedMessageRepository } from "@assistant-ui/react";
import { createPiThreadState } from "./threadState";
import { usePiRuntime } from "./usePiRuntime";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.adapters.length = 0;
  vi.clearAllMocks();
  vi.restoreAllMocks();
});

describe("usePiRuntime error callbacks", () => {
  it.each(["throws", "rejects"] as const)(
    "preserves the controller error when onError %s",
    async (failureMode) => {
      mocks.state = createPiThreadState("t1");
      mocks.repository = ExportedMessageRepository.fromArray([]);
      const controllerError = new Error("send failed");
      const callbackError = new Error("telemetry failed");
      mocks.controller.sendMessage.mockRejectedValueOnce(controllerError);
      const onError = vi.fn(
        failureMode === "throws"
          ? () => {
              throw callbackError;
            }
          : async () => {
              throw callbackError;
            },
      );
      const consoleError = vi
        .spyOn(console, "error")
        .mockImplementation(() => {});

      const App = () => {
        usePiRuntime({
          client: {} as PiClient,
          onError,
          initialThreadId: "t1",
        });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.at(-1)!;
      const message: AppendMessage = {
        role: "user",
        content: [{ type: "text", text: "hello" }],
      };

      await expect(adapter.onNew(message)).rejects.toBe(controllerError);
      expect(onError).toHaveBeenCalledWith(controllerError);
      await vi.waitFor(() =>
        expect(consoleError).toHaveBeenCalledWith(
          "[react-pi] onError callback threw an error",
          callbackError,
        ),
      );
    },
  );
});
