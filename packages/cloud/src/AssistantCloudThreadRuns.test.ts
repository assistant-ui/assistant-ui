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
      heartbeat_interval_ms: 20000,
    });
    await expect(runs.heartbeat("t1", "lease/1")).resolves.toEqual({
      heartbeat_interval_ms: 20000,
    });
    expect(makeRequest).toHaveBeenCalledWith(
      "/threads/t1/runs/lease%2F1/heartbeat",
      { method: "POST" },
    );
  });

  it("opens a thread's lease under the message it answers", async () => {
    const { runs, makeRequest } = createRuns();
    makeRequest.mockResolvedValue({
      lease_id: "lease_1",
      heartbeat_interval_ms: 20000,
    });
    await expect(runs.open("t/1", { parent_id: "msg_1" })).resolves.toEqual({
      lease_id: "lease_1",
      heartbeat_interval_ms: 20000,
    });
    await runs.open("t1", { parent_external_id: "u1" });
    await runs.open("t1");
    expect(makeRequest.mock.calls).toEqual([
      ["/threads/t%2F1/runs", { method: "POST", body: { parent_id: "msg_1" } }],
      [
        "/threads/t1/runs",
        { method: "POST", body: { parent_external_id: "u1" } },
      ],
      ["/threads/t1/runs", { method: "POST", body: {} }],
    ]);
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
