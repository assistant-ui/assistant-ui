// @vitest-environment jsdom

import { renderHook } from "@testing-library/react";
import type { AssistantCloud } from "assistant-cloud";
import { describe, expect, it, vi } from "vitest";
import { DEFAULT_CLOUD_SCOPE } from "./AssistantCloudThreadHistoryAdapter";
import { createCloudThreadListAdapter } from "./createCloudThreadListAdapter";
import { useCloudThreadListAdapter } from "./useCloudThreadListAdapter";

const { observedScopes } = vi.hoisted(() => ({
  observedScopes: [] as unknown[],
}));

vi.mock("./AssistantCloudThreadHistoryAdapter", async (importOriginal) => ({
  ...(await importOriginal<
    typeof import("./AssistantCloudThreadHistoryAdapter")
  >()),
  useScopedAssistantCloudThreadHistoryAdapter: (
    _cloudRef: unknown,
    scopeRef: { current: unknown },
  ) => {
    observedScopes.push(scopeRef.current);
    return { feedback: undefined };
  },
}));

describe("Cloud runtime adapter scope", () => {
  it("uses one default scope across the hook and standalone factory", () => {
    const cloud = {
      registerSdk: vi.fn(),
    } as unknown as AssistantCloud;

    const wrapper = renderHook(() => {
      const adapter = useCloudThreadListAdapter({ cloud });
      return adapter.unstable_useAdapters!();
    });
    wrapper.unmount();

    const adapter = createCloudThreadListAdapter({ cloud });
    const factory = renderHook(() => adapter.unstable_useAdapters!());
    factory.unmount();

    expect(observedScopes).toEqual([DEFAULT_CLOUD_SCOPE, DEFAULT_CLOUD_SCOPE]);
  });
});
