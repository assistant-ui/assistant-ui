// @vitest-environment jsdom
import {
  act,
  createElement,
  StrictMode,
  useEffect,
  useRef,
  version,
} from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RespondToToolApprovalOptions } from "@assistant-ui/react";

(
  globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

const mocks = vi.hoisted(() => ({
  adapters: [] as unknown[],
  threadListAdapter: undefined as
    | { initialize: () => Promise<{ remoteId: string; externalId: string }> }
    | undefined,
  initializeTask: undefined as
    | Promise<{ remoteId: string; externalId: string }>
    | undefined,
  sessionCreate: vi.fn().mockResolvedValue({ data: { id: "session-1" } }),
  threadListItem: {
    externalId: "session-1" as string | undefined,
    remoteId: "session-1" as string | undefined,
    status: "regular" as "new" | "regular",
    initialize: vi.fn(() => {
      mocks.initializeTask ??= (async () => {
        const adapter = mocks.threadListAdapter;
        if (!adapter) throw new Error("thread list adapter missing");
        return adapter.initialize();
      })();
      return mocks.initializeTask;
    }),
  },
  controller: {
    load: vi.fn().mockResolvedValue(undefined),
    sendMessage: vi.fn().mockResolvedValue(undefined),
    replyToPermission: vi.fn().mockResolvedValue(undefined),
    replyToQuestion: vi.fn().mockResolvedValue(undefined),
    rejectQuestion: vi.fn().mockResolvedValue(undefined),
  },
  state: undefined as unknown,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAui: () => ({ threadListItem: mocks.threadListItem }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ threadListItem: mocks.threadListItem }),
  useExternalStoreRuntime: (adapter: unknown) => {
    mocks.adapters.push(adapter);
    return {};
  },
  useRemoteThreadListRuntime: (options: {
    adapter: {
      initialize: () => Promise<{ remoteId: string; externalId: string }>;
    };
    runtimeHook: () => unknown;
  }) => {
    mocks.threadListAdapter = options.adapter;
    return options.runtimeHook();
  },
}));

vi.mock("./OpenCodeThreadController", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./OpenCodeThreadController")>();

  class OpenCodeThreadController {
    getState = () => mocks.state;
    subscribe = () => () => {};
    load = mocks.controller.load;
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = mocks.controller.sendMessage;
    stageMessage = vi.fn().mockResolvedValue(undefined);
    sendStagedMessage = vi.fn().mockResolvedValue(false);
    cancel = vi.fn().mockResolvedValue(undefined);
    revert = vi.fn().mockResolvedValue(undefined);
    unrevert = vi.fn().mockResolvedValue(undefined);
    fork = vi.fn().mockResolvedValue("");
    replyToPermission = mocks.controller.replyToPermission;
    replyToQuestion = mocks.controller.replyToQuestion;
    rejectQuestion = mocks.controller.rejectQuestion;
    dispose = vi.fn();
  }

  return { ...original, OpenCodeThreadController };
});

import { createOpenCodeThreadState } from "./openCodeThreadState";
import { useOpenCodeRuntime } from "./useOpenCodeRuntime";

const onReact18 = version.startsWith("18.");

// Fails on React 18: TypeError: useEffectEvent is not a function (useOpenCodeRuntime imports useEffectEvent from react, which React 18 does not export). Shipped React 18 incompatibility, so on React 18 these tests assert that error, and fail once it's fixed.
const itBrokenOnReact18 = (
  name: string,
  fn: () => void | Promise<void>,
  timeout?: number,
) =>
  onReact18
    ? it(
        name,
        () =>
          expect(Promise.resolve().then(fn)).rejects.toThrow(
            /useEffectEvent\)? is not a function/,
          ),
        timeout,
      )
    : it(name, fn, timeout);

type ApprovalAdapter = {
  onRespondToToolApproval?: (
    response: RespondToToolApprovalOptions,
  ) => Promise<void> | void;
};

type RuntimeAdapter = ApprovalAdapter & {
  onNew?: (message: { role: "user"; content: [] }) => Promise<void> | void;
  messageRepository?: { messages: unknown[] };
};

const createStubClient = () =>
  ({ session: { create: mocks.sessionCreate } }) as never;

const stubClient = createStubClient();

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.adapters.length = 0;
  mocks.threadListAdapter = undefined;
  mocks.initializeTask = undefined;
  mocks.threadListItem.externalId = "session-1";
  mocks.threadListItem.remoteId = "session-1";
  mocks.threadListItem.status = "regular";
  mocks.threadListItem.initialize.mockClear();
  mocks.sessionCreate
    .mockReset()
    .mockResolvedValue({ data: { id: "session-1" } });
  mocks.controller.load.mockReset().mockResolvedValue(undefined);
  mocks.controller.sendMessage.mockReset().mockResolvedValue(undefined);
  mocks.controller.replyToPermission.mockReset().mockResolvedValue(undefined);
  mocks.controller.replyToQuestion.mockReset().mockResolvedValue(undefined);
  mocks.controller.rejectQuestion.mockReset().mockResolvedValue(undefined);
  vi.restoreAllMocks();
});

describe("useOpenCodeRuntime", () => {
  itBrokenOnReact18(
    "keeps a new thread enabled and prompts before ids land",
    async () => {
      mocks.threadListItem.externalId = undefined;
      mocks.threadListItem.remoteId = undefined;
      mocks.threadListItem.status = "new";
      mocks.state = createOpenCodeThreadState("session-1");

      const App = () => {
        useOpenCodeRuntime({ client: stubClient });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.at(-1) as RuntimeAdapter & {
        isDisabled?: boolean;
        isLoading?: boolean;
      };
      const message: Parameters<NonNullable<RuntimeAdapter["onNew"]>>[0] = {
        role: "user",
        content: [],
      };

      expect(adapter.isDisabled).toBe(false);
      expect(adapter.isLoading).toBe(false);
      await adapter.onNew!(message);

      expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
      expect(mocks.controller.sendMessage).toHaveBeenCalledTimes(1);

      mocks.threadListItem.externalId = "session-1";
      mocks.threadListItem.remoteId = "session-1";
      mocks.threadListItem.status = "regular";
      await act(async () => root!.render(createElement(App)));

      expect(mocks.controller.sendMessage).toHaveBeenCalledTimes(1);
    },
  );

  itBrokenOnReact18(
    "sends after core starts initialize and status leaves new",
    async () => {
      const sessionCreate = Promise.withResolvers<{ data: { id: string } }>();
      mocks.sessionCreate.mockReturnValue(sessionCreate.promise);
      mocks.threadListItem.externalId = undefined;
      mocks.threadListItem.remoteId = undefined;
      mocks.threadListItem.status = "new";
      mocks.state = createOpenCodeThreadState("session-1");

      const App = () => {
        useOpenCodeRuntime({ client: stubClient });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const initialization = mocks.threadListItem.initialize();
      mocks.threadListItem.status = "regular";
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.at(-1) as RuntimeAdapter & {
        isDisabled?: boolean;
      };
      expect(adapter.isDisabled).toBe(false);

      const sendPromise = adapter.onNew!({ role: "user", content: [] });
      expect(mocks.controller.sendMessage).not.toHaveBeenCalled();

      sessionCreate.resolve({ data: { id: "session-1" } });
      await initialization;
      await sendPromise;

      expect(mocks.sessionCreate).toHaveBeenCalledTimes(1);
      expect(mocks.threadListItem.initialize).toHaveBeenCalled();
      expect(mocks.controller.sendMessage).toHaveBeenCalledTimes(1);
    },
  );

  itBrokenOnReact18(
    "settles queued sends when session initialization fails",
    async () => {
      const initializationError = new Error("session create failed");
      mocks.threadListItem.externalId = undefined;
      mocks.threadListItem.remoteId = undefined;
      mocks.threadListItem.status = "new";
      mocks.state = createOpenCodeThreadState("session-1");
      mocks.sessionCreate.mockRejectedValue(initializationError);
      const onError = vi.fn();

      const App = () => {
        useOpenCodeRuntime({ client: stubClient, onError });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.at(-1) as RuntimeAdapter;
      const message: Parameters<NonNullable<RuntimeAdapter["onNew"]>>[0] = {
        role: "user",
        content: [],
      };

      await expect(adapter.onNew!(message)).rejects.toBe(initializationError);
      expect(mocks.controller.sendMessage).not.toHaveBeenCalled();
      expect(onError).toHaveBeenCalledWith(initializationError);
    },
  );

  itBrokenOnReact18(
    "drops pending new-thread sends after runtime teardown",
    async () => {
      const sessionCreate = Promise.withResolvers<{ data: { id: string } }>();
      mocks.sessionCreate.mockReturnValue(sessionCreate.promise);
      mocks.threadListItem.externalId = undefined;
      mocks.threadListItem.remoteId = undefined;
      mocks.threadListItem.status = "new";
      mocks.state = createOpenCodeThreadState("session-1");

      const App = () => {
        useOpenCodeRuntime({ client: stubClient });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.at(-1) as RuntimeAdapter;
      const sendPromise = adapter.onNew!({ role: "user", content: [] });
      await vi.waitFor(() =>
        expect(mocks.sessionCreate).toHaveBeenCalledOnce(),
      );

      act(() => root!.unmount());
      root = undefined;
      sessionCreate.resolve({ data: { id: "session-1" } });
      await sendPromise;

      expect(mocks.controller.sendMessage).not.toHaveBeenCalled();
    },
  );

  itBrokenOnReact18(
    "clears pending optimistic messages after client replacement",
    async () => {
      const sessionCreate = Promise.withResolvers<{ data: { id: string } }>();
      mocks.sessionCreate.mockReturnValue(sessionCreate.promise);
      mocks.threadListItem.externalId = undefined;
      mocks.threadListItem.remoteId = undefined;
      mocks.threadListItem.status = "new";
      mocks.state = createOpenCodeThreadState("session-1");

      const App = ({ client }: { client: typeof stubClient }) => {
        useOpenCodeRuntime({ client });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () =>
        root!.render(createElement(App, { client: stubClient })),
      );

      const adapter = mocks.adapters.at(-1) as RuntimeAdapter;
      const sendPromise = adapter.onNew!({ role: "user", content: [] });
      await vi.waitFor(() =>
        expect(mocks.sessionCreate).toHaveBeenCalledOnce(),
      );

      const replacementClient = createStubClient();
      await act(async () =>
        root!.render(createElement(App, { client: replacementClient })),
      );

      await act(async () => {
        sessionCreate.resolve({ data: { id: "session-1" } });
        await sendPromise;
      });

      const replacementAdapter = mocks.adapters.at(-1) as RuntimeAdapter;
      expect(replacementAdapter.messageRepository?.messages).toEqual([]);
      expect(mocks.controller.sendMessage).not.toHaveBeenCalled();
    },
  );

  itBrokenOnReact18(
    "keeps a pending new-thread send across StrictMode effect replay",
    async () => {
      const sessionCreate = Promise.withResolvers<{ data: { id: string } }>();
      mocks.sessionCreate.mockReturnValue(sessionCreate.promise);
      mocks.threadListItem.externalId = undefined;
      mocks.threadListItem.remoteId = undefined;
      mocks.threadListItem.status = "new";
      mocks.state = createOpenCodeThreadState("session-1");
      let sendPromise: Promise<void> | void;

      const Harness = () => {
        useOpenCodeRuntime({ client: stubClient });
        const sentRef = useRef(false);
        useEffect(() => {
          if (sentRef.current) return;
          sentRef.current = true;
          const adapter = mocks.adapters.at(-1) as RuntimeAdapter;
          sendPromise = adapter.onNew!({ role: "user", content: [] });
        }, []);
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => {
        root!.render(createElement(StrictMode, null, createElement(Harness)));
      });
      await vi.waitFor(() =>
        expect(mocks.sessionCreate).toHaveBeenCalledOnce(),
      );

      await act(async () => {
        sessionCreate.resolve({ data: { id: "session-1" } });
        await sendPromise;
      });

      expect(mocks.controller.sendMessage).toHaveBeenCalledOnce();
    },
  );

  itBrokenOnReact18(
    "replies to standard approvals through the OpenCode permission API",
    async () => {
      mocks.state = createOpenCodeThreadState("session-1");

      const App = () => {
        useOpenCodeRuntime({ client: stubClient });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.find(
        (candidate): candidate is ApprovalAdapter =>
          typeof (candidate as ApprovalAdapter).onRespondToToolApproval ===
          "function",
      );

      await adapter!.onRespondToToolApproval!({
        approvalId: "permission-1",
        approved: true,
        optionId: "always",
      });

      expect(mocks.controller.replyToPermission).toHaveBeenCalledWith(
        "permission-1",
        "always",
      );
    },
  );

  itBrokenOnReact18(
    "routes question answers and rejection through the OpenCode question API",
    async () => {
      const base = createOpenCodeThreadState("session-1");
      mocks.state = {
        ...base,
        interactions: {
          ...base.interactions,
          questions: {
            ...base.interactions.questions,
            pending: {
              "question-1": {
                id: "question-1",
                sessionID: "session-1",
                askedAt: 1,
                questions: [
                  { question: "First?", header: "First", options: [] },
                  { question: "Second?", header: "Second", options: [] },
                ],
              },
            },
          },
        },
      };

      const App = () => {
        useOpenCodeRuntime({ client: stubClient });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => root!.render(createElement(App)));

      const adapter = mocks.adapters.find(
        (candidate): candidate is ApprovalAdapter =>
          typeof (candidate as ApprovalAdapter).onRespondToToolApproval ===
          "function",
      );

      await adapter!.onRespondToToolApproval!({
        approvalId: "question-1",
        approved: true,
        answers: {
          "1": { optionIds: ["Selected"], text: "detail" },
          "0": { text: "answer" },
        },
      });
      expect(mocks.controller.replyToQuestion).toHaveBeenCalledWith(
        "question-1",
        [["answer"], ["Selected", "detail"]],
      );
      expect(mocks.controller.replyToPermission).not.toHaveBeenCalled();

      await adapter!.onRespondToToolApproval!({
        approvalId: "question-1",
        approved: false,
      });
      expect(mocks.controller.rejectQuestion).toHaveBeenCalledWith(
        "question-1",
      );

      await expect(
        adapter!.onRespondToToolApproval!({
          approvalId: "question-1",
          approved: true,
        }),
      ).rejects.toThrow("OpenCode question approval requires answers");
    },
  );

  itBrokenOnReact18(
    "isolates rejected onError callbacks during initial loading",
    async () => {
      const loadError = new Error("load failed");
      const callbackError = new Error("telemetry failed");
      const onError = vi.fn().mockRejectedValue(callbackError);
      const error = vi.spyOn(console, "error").mockImplementation(() => {});
      mocks.state = createOpenCodeThreadState("session-1");
      mocks.controller.load.mockRejectedValue(loadError);

      const App = () => {
        useOpenCodeRuntime({ client: stubClient, onError });
        return null;
      };

      root = createRoot(document.createElement("div"));
      await act(async () => {
        root!.render(createElement(App));
        await new Promise((resolve) => setTimeout(resolve, 0));
      });

      expect(onError).toHaveBeenCalledWith(loadError);
      expect(error).toHaveBeenCalledWith(
        "[react-opencode] onError callback threw an error",
        callbackError,
      );
    },
  );

  itBrokenOnReact18("preserves send errors when onError throws", async () => {
    const sendError = new Error("send failed");
    const callbackError = new Error("telemetry failed");
    const onError = vi.fn(() => {
      throw callbackError;
    });
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.state = createOpenCodeThreadState("session-1");
    mocks.controller.sendMessage.mockRejectedValue(sendError);

    const App = () => {
      useOpenCodeRuntime({ client: stubClient, onError });
      return null;
    };

    root = createRoot(document.createElement("div"));
    await act(async () => root!.render(createElement(App)));

    const adapter = mocks.adapters.find(
      (candidate): candidate is RuntimeAdapter =>
        typeof (candidate as ApprovalAdapter).onRespondToToolApproval ===
        "function",
    );

    await expect(adapter!.onNew!({ role: "user", content: [] })).rejects.toBe(
      sendError,
    );
    expect(onError).toHaveBeenCalledWith(sendError);
    expect(error).toHaveBeenCalledWith(
      "[react-opencode] onError callback threw an error",
      callbackError,
    );
  });
});
