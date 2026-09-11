// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import type { AssistantRuntime } from "../../../runtime/api/assistant-runtime";
import { useCloudThreadListRuntime } from "./useCloudThreadListRuntime";

const mocks = vi.hoisted(() => ({
  useCloudThreadListAdapter: vi.fn(),
  useRemoteThreadListRuntime: vi.fn(),
}));

vi.mock("./useCloudThreadListAdapter", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./useCloudThreadListAdapter")>()),
  useCloudThreadListAdapter: mocks.useCloudThreadListAdapter,
}));

vi.mock("../useRemoteThreadListRuntime", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../useRemoteThreadListRuntime")>()),
  useRemoteThreadListRuntime: mocks.useRemoteThreadListRuntime,
}));

describe("useCloudThreadListRuntime", () => {
  it("forwards cloud options to the adapter and nests the runtime hook", () => {
    const cloud = { threads: {} } as AssistantCloud;
    const runtimeHook = () => ({}) as AssistantRuntime;
    const create = vi.fn();
    const del = vi.fn();
    const adapter = { list: vi.fn() };
    const runtime = { kind: "runtime" };
    mocks.useCloudThreadListAdapter.mockReturnValue(adapter);
    mocks.useRemoteThreadListRuntime.mockReturnValue(runtime);

    const { result } = renderHook(() =>
      useCloudThreadListRuntime({
        cloud,
        runtimeHook,
        create,
        delete: del,
      }),
    );

    expect(mocks.useCloudThreadListAdapter).toHaveBeenCalledWith({
      cloud,
      create,
      delete: del,
    });
    expect(mocks.useRemoteThreadListRuntime).toHaveBeenCalledWith({
      runtimeHook,
      adapter,
      allowNesting: true,
    });
    expect(result.current).toBe(runtime);
  });
});
