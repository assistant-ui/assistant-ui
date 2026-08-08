import { describe, expect, it, vi } from "vitest";
import type { AssistantCloudAPI } from "./AssistantCloudAPI";
import { AssistantCloudRuns } from "./AssistantCloudRuns";

const createCloudRuns = () => {
  const makeRequest = vi.fn();
  const api = { makeRequest } as unknown as AssistantCloudAPI;
  return { runs: new AssistantCloudRuns(api), makeRequest };
};

describe("AssistantCloudRuns responses", () => {
  it("validates reported run IDs", async () => {
    const { runs, makeRequest } = createCloudRuns();
    const body = { thread_id: "thread-1", status: "completed" } as const;
    makeRequest.mockResolvedValueOnce({ run_id: "run-1" });

    await expect(runs.report(body)).resolves.toEqual({ run_id: "run-1" });

    makeRequest.mockResolvedValueOnce({});

    await expect(runs.report(body)).rejects.toThrow(
      'Invalid Assistant Cloud response for "run_id": expected a string',
    );
  });
});
