import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  classifyFailure,
  classifyToolResult,
  getClientContext,
  isTelemetryEnabled,
  trackReportIssue,
  trackToolCall,
} from "../../telemetry.js";
import type { CallToolResult } from "@modelcontextprotocol/server";
import {
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";

const { MOCK_POSTHOG_CAPTURE } = vi.hoisted(() => ({
  MOCK_POSTHOG_CAPTURE: vi.fn(),
}));

vi.mock("posthog-node", () => ({
  PostHog: class {
    capture = MOCK_POSTHOG_CAPTURE;
    flush = vi.fn().mockResolvedValue(undefined);
  },
}));

function textResult(
  text: string,
  extra?: Partial<CallToolResult>,
): CallToolResult {
  return { content: [{ type: "text", text }], ...extra };
}

const clientContext = {
  mcp_client_name: "claude",
  mcp_client_version: "1.2.3",
  mcp_protocol_version: "2025-11-25",
};

describe("classifyToolResult", () => {
  it("classifies a plain text result as success", () => {
    expect(
      classifyToolResult(textResult("all good"), undefined, false),
    ).toEqual({
      status: "success",
    });
  });

  it("classifies a JSON result without an error field as success", () => {
    const result = textResult(
      JSON.stringify({ path: "/", found: true, type: "directory" }, null, 2),
    );
    expect(classifyToolResult(result, undefined, false)).toEqual({
      status: "success",
    });
  });

  it("classifies a JSON result with an error field as soft_fail", () => {
    const result = textResult(
      JSON.stringify(
        {
          error: "Documentation not found for path: /missing",
          path: "/missing",
        },
        null,
        2,
      ),
    );
    expect(classifyToolResult(result, undefined, false)).toEqual({
      status: "soft_fail",
      failure_category: "not_found",
    });
  });

  it("classifies an isError result as failed", () => {
    expect(
      classifyToolResult(
        textResult("nope", { isError: true }),
        undefined,
        false,
      ),
    ).toEqual({ status: "failed", failure_category: "internal" });
  });

  it("classifies a thrown error as failed", () => {
    expect(classifyToolResult(undefined, new Error("boom"), false)).toEqual({
      status: "failed",
      failure_category: "internal",
    });
  });

  it("classifies an aborted request as aborted", () => {
    expect(classifyToolResult(textResult("partial"), undefined, true)).toEqual({
      status: "aborted",
    });
  });

  it("reads the error from structuredContent when present", () => {
    const result = {
      content: [{ type: "text", text: "opaque" }],
      structuredContent: { error: "Timeout after 30s" },
    } as CallToolResult;
    expect(classifyToolResult(result, undefined, false)).toEqual({
      status: "soft_fail",
      failure_category: "timeout",
    });
  });

  it("maps an internal error text to failed", () => {
    const result = textResult(
      JSON.stringify({ error: "Failed to retrieve documentation" }, null, 2),
    );
    expect(classifyToolResult(result, undefined, false)).toEqual({
      status: "failed",
      failure_category: "internal",
    });
  });
});

describe("classifyFailure", () => {
  it("classifies known failure categories", () => {
    expect(classifyFailure("Invalid input provided")).toBe("validation");
    expect(classifyFailure("Path not found")).toBe("not_found");
    expect(classifyFailure("Connection refused")).toBe("connection");
    expect(classifyFailure("Request timed out")).toBe("timeout");
    expect(classifyFailure("Unauthorized access")).toBe("auth");
  });

  it("falls back to internal for unknown failures", () => {
    expect(classifyFailure("Something odd happened")).toBe("internal");
  });
});

describe("getClientContext", () => {
  it("reads client info and protocol version from the request envelope", () => {
    const ctx = {
      mcpReq: {
        signal: new AbortController().signal,
        envelope: {
          [CLIENT_INFO_META_KEY]: { name: "cursor", version: "0.42.0" },
          [PROTOCOL_VERSION_META_KEY]: "2026-07-28",
        },
      },
    } as any;
    expect(getClientContext(ctx)).toEqual({
      mcp_client_name: "cursor",
      mcp_client_version: "0.42.0",
      mcp_protocol_version: "2026-07-28",
    });
  });

  it("returns empty strings when the envelope is absent", () => {
    const ctx = { mcpReq: { signal: new AbortController().signal } } as any;
    expect(getClientContext(ctx)).toEqual({
      mcp_client_name: "",
      mcp_client_version: "",
      mcp_protocol_version: "",
    });
  });
});

describe("telemetry events", () => {
  beforeEach(() => {
    MOCK_POSTHOG_CAPTURE.mockClear();
  });

  afterEach(() => {
    vi.resetModules();
    delete process.env.ASSISTANT_UI_MCP_TELEMETRY;
    delete process.env.ASSISTANT_UI_POSTHOG_API_KEY;
  });

  it("is enabled by default when the env var is unset", () => {
    delete process.env.ASSISTANT_UI_MCP_TELEMETRY;
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("can be disabled with falsy env values", () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "false";
    expect(isTelemetryEnabled()).toBe(false);
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "0";
    expect(isTelemetryEnabled()).toBe(false);
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "off";
    expect(isTelemetryEnabled()).toBe(false);
  });

  it("stays enabled for truthy env values", () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "1";
    expect(isTelemetryEnabled()).toBe(true);
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "true";
    expect(isTelemetryEnabled()).toBe(true);
  });

  it("tracks a tool call event with the required properties", () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "1";
    process.env.ASSISTANT_UI_POSTHOG_API_KEY = "phc_test";

    trackToolCall({
      toolName: "assistantUIDocs",
      startTime: Date.now() - 5,
      status: "success",
      transport: "stdio",
      serverVersion: "0.2.0",
      clientContext,
    });

    expect(MOCK_POSTHOG_CAPTURE).toHaveBeenCalledTimes(1);
    const [call] = MOCK_POSTHOG_CAPTURE.mock.calls[0];
    expect(call.event).toBe("MCP Tool Call");
    expect(call.properties).toMatchObject({
      tool_name: "assistantUIDocs",
      status: "success",
      duration_ms: 5,
      transport: "stdio",
      server_version: "0.2.0",
      mcp_client_name: "claude",
      mcp_client_version: "1.2.3",
      mcp_protocol_version: "2025-11-25",
    });
  });

  it("attaches the failure category for failed tool calls", () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "1";
    process.env.ASSISTANT_UI_POSTHOG_API_KEY = "phc_test";

    trackToolCall({
      toolName: "assistantUIDocs",
      startTime: Date.now(),
      status: "soft_fail",
      failureCategory: "not_found",
      transport: "stdio",
      serverVersion: "0.2.0",
      clientContext,
    });

    expect(MOCK_POSTHOG_CAPTURE).toHaveBeenCalledTimes(1);
    const [call] = MOCK_POSTHOG_CAPTURE.mock.calls[0];
    expect(call.properties).toMatchObject({
      status: "soft_fail",
      failure_category: "not_found",
    });
  });

  it("tracks a report issue event without sending the message body", () => {
    process.env.ASSISTANT_UI_MCP_TELEMETRY = "1";
    process.env.ASSISTANT_UI_POSTHOG_API_KEY = "phc_test";

    trackReportIssue({
      toolName: "assistantUIDocs",
      relatedTools: ["assistantUISearch"],
      transport: "stdio",
      serverVersion: "0.2.0",
      clientContext,
    });

    expect(MOCK_POSTHOG_CAPTURE).toHaveBeenCalledTimes(1);
    const [call] = MOCK_POSTHOG_CAPTURE.mock.calls[0];
    expect(call.event).toBe("MCP Report Issue");
    const { properties } = call;
    expect(properties).toMatchObject({
      tool_name: "assistantUIDocs",
      related_tools: ["assistantUISearch"],
      transport: "stdio",
      server_version: "0.2.0",
    });
    // The user-supplied message is never sent to PostHog.
    expect(properties).not.toHaveProperty("message");
  });
});
