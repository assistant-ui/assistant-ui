// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AssistantCloud } from "assistant-cloud";
import type { AssistantRuntime } from "@assistant-ui/core";

const mocks = vi.hoisted(() => ({
  cloudAdapter: {},
  runtime: {},
  useCloudThreadListAdapter: vi.fn(() => ({})),
  useRemoteThreadListRuntime: vi.fn(() => ({})),
}));

vi.mock("@assistant-ui/core/react", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/core/react")>()),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
  useRemoteThreadListRuntime: mocks.useRemoteThreadListRuntime,
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    threadListItem: {
      source: null,
      getState: () => ({ externalId: undefined }),
      initialize: vi.fn(),
    },
  }),
}));

import { LANGGRAPH_SDK } from "./sdkIdentity";
import { useLangGraphRuntime } from "./useLangGraphRuntime";

describe("useLangGraphRuntime Cloud options", () => {
  it("forwards the Cloud scope to the thread-list adapter", () => {
    const cloud = {} as AssistantCloud;
    mocks.useCloudThreadListAdapter.mockReturnValue(mocks.cloudAdapter);
    mocks.useRemoteThreadListRuntime.mockReturnValue(
      mocks.runtime as AssistantRuntime,
    );

    renderHook(() =>
      useLangGraphRuntime({
        stream: vi.fn(),
        cloud,
        scopeId: "workspace-1",
      }),
    );

    expect(mocks.useCloudThreadListAdapter).toHaveBeenCalledWith(
      expect.objectContaining({
        cloud,
        scopeId: "workspace-1",
        sdk: LANGGRAPH_SDK,
      }),
    );
  });
});
