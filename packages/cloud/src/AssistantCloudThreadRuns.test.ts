import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadRuns } from "./AssistantCloudThreadRuns";

const createRuns = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { runs: new AssistantCloudThreadRuns(api), makeRequest };
};

describe("AssistantCloudThreadRuns", () => {
  it("heartbeats by lease id alone", async () => {
    const { runs, makeRequest } = createRuns();
    makeRequest.mockResolvedValueOnce({
      expires_in_ms: 90000,
      heartbeat_interval_ms: 20000,
    });
    await expect(runs.heartbeat("t1", "lease/1")).resolves.toEqual({
      expires_in_ms: 90000,
      heartbeat_interval_ms: 20000,
    });
    expect(makeRequest).toHaveBeenCalledWith(
      "/threads/t1/runs/lease%2F1/heartbeat",
      { method: "POST" },
    );
  });

  it("ends a run with an optional reason", async () => {
    const { runs, makeRequest } = createRuns();
    makeRequest.mockResolvedValue({});
    await runs.end("t1", "lease_1", { reason: "cancelled" });
    await runs.end("t1", "lease_1");
    expect(makeRequest.mock.calls).toEqual([
      [
        "/threads/t1/runs/lease_1/end",
        { method: "POST", body: { reason: "cancelled" } },
      ],
      ["/threads/t1/runs/lease_1/end", { method: "POST", body: {} }],
    ]);
  });
});
