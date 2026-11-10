import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudThreadRuns } from "./AssistantCloudThreadRuns";
import { CloudResponseError } from "./cloudResponse";

const createRuns = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { runs: new AssistantCloudThreadRuns(api), makeRequest };
};

describe("AssistantCloudThreadRuns", () => {
  it("opens a run on a stored message", async () => {
    const { runs, makeRequest } = createRuns();
    makeRequest.mockResolvedValueOnce({
      lease_id: "lease_1",
      expires_in_ms: 90000,
      heartbeat_interval_ms: 20000,
    });
    await expect(runs.open("t/1", "msg/1")).resolves.toEqual({
      lease_id: "lease_1",
      expires_in_ms: 90000,
      heartbeat_interval_ms: 20000,
    });
    expect(makeRequest).toHaveBeenCalledWith(
      "/threads/t%2F1/messages/msg%2F1/runs",
      { method: "POST" },
    );

    makeRequest.mockResolvedValueOnce({ lease_id: "lease_1" });
    await expect(runs.open("t1", "m1")).rejects.toThrow(CloudResponseError);
  });

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
    await runs.end(
      "t1",
      "lease_1",
      { reason: "interrupted" },
      { keepalive: true },
    );
    expect(makeRequest.mock.calls).toEqual([
      [
        "/threads/t1/runs/lease_1/end",
        { method: "POST", body: { reason: "cancelled" } },
      ],
      ["/threads/t1/runs/lease_1/end", { method: "POST", body: {} }],
      [
        "/threads/t1/runs/lease_1/end",
        {
          method: "POST",
          body: { reason: "interrupted" },
          keepalive: true,
        },
      ],
    ]);
  });
});
