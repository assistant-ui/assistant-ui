// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime, ChatModelAdapter } from "../../index";

const mocks = vi.hoisted(() => ({
  cloudAdapter: {},
  runtime: {},
  useCloudThreadListAdapter: vi.fn(() => ({})),
  useRemoteThreadListRuntime: vi.fn(() => ({})),
}));

vi.mock("./cloud/useCloudThreadListAdapter", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("./cloud/useCloudThreadListAdapter")
  >()),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
}));

vi.mock("./useRemoteThreadListRuntime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useRemoteThreadListRuntime")>()),
  useRemoteThreadListRuntime: mocks.useRemoteThreadListRuntime,
}));

import { useLocalRuntime } from "./useLocalRuntime";

describe("useLocalRuntime Cloud options", () => {
  it("forwards the Cloud scope to the thread-list adapter", () => {
    const cloud = {} as AssistantCloud;
    const chatModel: ChatModelAdapter = {
      run: async () => ({ content: [] }),
    };
    mocks.useCloudThreadListAdapter.mockReturnValue(mocks.cloudAdapter);
    mocks.useRemoteThreadListRuntime.mockReturnValue(
      mocks.runtime as AssistantRuntime,
    );

    renderHook(() =>
      useLocalRuntime(chatModel, { cloud, scopeId: "workspace-1" }),
    );

    expect(mocks.useCloudThreadListAdapter).toHaveBeenCalledWith({
      cloud,
      scopeId: "workspace-1",
    });
  });
});
