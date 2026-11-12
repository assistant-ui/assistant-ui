import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getStatusState: vi.fn(),
  isModelProviderDegraded: vi.fn(),
}));

vi.mock("@/lib/status", () => ({ getStatusState: mocks.getStatusState }));
vi.mock("@/lib/ai/model-provider-errors", () => ({
  isModelProviderDegraded: mocks.isModelProviderDegraded,
}));

import { GET } from "./route";

const read = async () => {
  const response = await GET();
  return { status: response.status, body: await response.json() };
};

describe("GET /api/status", () => {
  it("passes the status page state through while the provider is healthy", async () => {
    mocks.getStatusState.mockResolvedValue("operational");
    mocks.isModelProviderDegraded.mockResolvedValue(false);

    expect(await read()).toEqual({
      status: 200,
      body: { state: "operational" },
    });
  });

  it("reports degraded after recent model provider failures", async () => {
    mocks.getStatusState.mockResolvedValue("operational");
    mocks.isModelProviderDegraded.mockResolvedValue(true);

    expect(await read()).toEqual({ status: 200, body: { state: "degraded" } });
  });

  it("keeps a worse status page state", async () => {
    mocks.getStatusState.mockResolvedValue("downtime");
    mocks.isModelProviderDegraded.mockResolvedValue(true);

    expect((await read()).body).toEqual({ state: "downtime" });
  });

  it("reports degraded even when the status page is unreachable", async () => {
    mocks.getStatusState.mockResolvedValue(null);
    mocks.isModelProviderDegraded.mockResolvedValue(true);

    expect(await read()).toEqual({ status: 200, body: { state: "degraded" } });
  });

  it("answers 503 when neither source says anything", async () => {
    mocks.getStatusState.mockResolvedValue(null);
    mocks.isModelProviderDegraded.mockRejectedValue(new Error("redis"));

    expect((await read()).status).toBe(503);
  });

  it("caches for a minute", async () => {
    mocks.getStatusState.mockResolvedValue("operational");
    mocks.isModelProviderDegraded.mockResolvedValue(false);

    expect((await GET()).headers.get("Cache-Control")).toBe(
      "public, max-age=60, s-maxage=60",
    );
  });
});
