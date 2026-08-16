// @vitest-environment jsdom
import { act, createElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { RespondToToolApprovalOptions } from "@assistant-ui/react";
import type { createOpencodeClient } from "@opencode-ai/sdk/v2/client";

const mocks = vi.hoisted(() => ({
  adapters: [] as unknown[],
  controller: {
    load: vi.fn().mockResolvedValue(undefined),
    replyToPermission: vi.fn().mockResolvedValue(undefined),
  },
  state: undefined as unknown,
}));

vi.mock("@assistant-ui/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/react")>()),
  useAuiState: () => "session-1",
  useExternalStoreRuntime: (adapter: unknown) => {
    mocks.adapters.push(adapter);
    return {};
  },
  useRemoteThreadListRuntime: (options: { runtimeHook: () => unknown }) =>
    options.runtimeHook(),
}));

vi.mock("./OpenCodeThreadController", async (importOriginal) => {
  const original =
    await importOriginal<typeof import("./OpenCodeThreadController")>();

  class OpenCodeThreadController {
    getState = () => mocks.state;
    subscribe = () => () => {};
    load = mocks.controller.load;
    refresh = vi.fn().mockResolvedValue(undefined);
    sendMessage = vi.fn().mockResolvedValue(undefined);
    stageMessage = vi.fn().mockResolvedValue(undefined);
    sendStagedMessage = vi.fn().mockResolvedValue(false);
    cancel = vi.fn().mockResolvedValue(undefined);
    revert = vi.fn().mockResolvedValue(undefined);
    unrevert = vi.fn().mockResolvedValue(undefined);
    fork = vi.fn().mockResolvedValue("");
    replyToPermission = mocks.controller.replyToPermission;
    replyToQuestion = vi.fn().mockResolvedValue(undefined);
    rejectQuestion = vi.fn().mockResolvedValue(undefined);
    dispose = vi.fn();
  }

  return { ...original, OpenCodeThreadController };
});

import { createOpenCodeThreadState } from "./openCodeThreadState";
import { useOpenCodeRuntime } from "./useOpenCodeRuntime";

type ApprovalAdapter = {
  onRespondToToolApproval?: (
    response: RespondToToolApprovalOptions,
  ) => Promise<void> | void;
};

const stubClient = {} as ReturnType<typeof createOpencodeClient>;

let root: Root | undefined;

afterEach(() => {
  act(() => root?.unmount());
  root = undefined;
  mocks.adapters.length = 0;
  vi.clearAllMocks();
});

describe("useOpenCodeRuntime tool approvals", () => {
  it("replies to standard approvals through the OpenCode permission API", async () => {
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
  });
});
