import { describe, it, expect, vi, beforeEach } from "vitest";

const mockCapture = vi.fn();
const mockFlush = vi.fn();
const mockOn = vi.fn();

function MockPostHog() {
  return {
    capture: mockCapture,
    flush: mockFlush,
    on: mockOn,
  };
}

vi.mock("posthog-node", () => ({
  PostHog: MockPostHog,
}));

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  delete process.env.ASSISTANT_UI_MCP_TELEMETRY;
  delete process.env.ASSISTANT_UI_POSTHOG_API_KEY;
  delete process.env.ASSISTANT_UI_POSTHOG_HOST;
});

describe("telemetry", () => {
  it("captures events when telemetry is enabled", async () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "true";
    const { captureEvent, flushTelemetry } = await import("../../telemetry.js");

    captureEvent("MCP Tool Call", { tool_name: "assistantUIDocs" });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const call = mockCapture.mock.calls[0][0];
    expect(call.event).toBe("MCP Tool Call");
    expect(call.properties.tool_name).toBe("assistantUIDocs");
    expect(call.properties.$process_person_profile).toBe(false);
    expect(call.properties.$ip).toBeNull();
    expect(call.distinctId).toBeDefined();

    await flushTelemetry();
    expect(mockFlush).toHaveBeenCalledTimes(1);
  });

  it("does not capture events when telemetry is disabled", async () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "false";
    const { captureEvent, flushTelemetry } = await import("../../telemetry.js");

    captureEvent("MCP Tool Call", { tool_name: "assistantUIDocs" });

    expect(mockCapture).not.toHaveBeenCalled();
    await flushTelemetry();
    expect(mockFlush).not.toHaveBeenCalled();
  });

  it("reuses the same anonymous distinct ID across captures", async () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "true";
    const { captureEvent } = await import("../../telemetry.js");

    captureEvent("event 1", {});
    captureEvent("event 2", {});

    const id1 = mockCapture.mock.calls[0][0].distinctId;
    const id2 = mockCapture.mock.calls[1][0].distinctId;
    expect(id1).toBe(id2);
  });

  it("captures the report-issue signal without a message body", async () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "true";
    const { trackReportIssue } = await import("../../telemetry.js");

    trackReportIssue({
      transport: "stdio",
      serverVersion: "0.2.0",
      clientContext: {
        mcp_client_name: "test-client",
        mcp_client_version: "1.0.0",
        mcp_protocol_version: "2025-01-01",
      },
    });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    const call = mockCapture.mock.calls[0][0];
    expect(call.event).toBe("MCP Report Issue");
    expect(call.properties.transport).toBe("stdio");
    expect(call.properties.server_version).toBe("0.2.0");
    expect(call.properties.mcp_client_name).toBe("test-client");
    expect(call.properties.message).toBeUndefined();
    expect(call.properties.tool_name).toBeUndefined();
    expect(call.properties.related_tools).toBeUndefined();
  });

  it("classifies validation errors as soft fails", async () => {
    const { classifyFailure } = await import("../../telemetry.js");

    expect(classifyFailure("Validation failed: path is required")).toBe(
      "validation",
    );
  });
});
