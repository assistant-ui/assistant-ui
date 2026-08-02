import { PostHog } from "posthog-node";
import { randomUUID } from "node:crypto";
import type {
  CallToolResult,
  ServerContext,
} from "@modelcontextprotocol/server";
import {
  CLIENT_INFO_META_KEY,
  PROTOCOL_VERSION_META_KEY,
} from "@modelcontextprotocol/server";
import { logger } from "./utils/logger.js";

let anonymousDistinctId: string | undefined;

const TELEMETRY_ENV = "ASSISTANT_UI_MCP_TELEMETRY";
const POSTHOG_API_KEY_ENV = "ASSISTANT_UI_POSTHOG_API_KEY";
const POSTHOG_HOST_ENV = "ASSISTANT_UI_POSTHOG_HOST";
const DEFAULT_POSTHOG_HOST = "https://us.i.posthog.com";
const HARDCODED_POSTHOG_API_KEY =
  "phc_152M6g9zucz3gAClKrbsy3NmJsbDzDlVvAumXuhR3Y0";

const DISABLED_VALUES = new Set(["0", "false", "off", "no"]);

export function isTelemetryEnabled(): boolean {
  const raw = process.env[TELEMETRY_ENV]?.trim().toLowerCase();
  if (raw === undefined || raw === "") return true;
  return !DISABLED_VALUES.has(raw);
}

let posthog: PostHog | null | undefined;

function getPosthog(): PostHog | null {
  if (posthog !== undefined) return posthog;
  posthog = null;
  if (!isTelemetryEnabled()) return posthog;

  const apiKey =
    process.env[POSTHOG_API_KEY_ENV]?.trim() || HARDCODED_POSTHOG_API_KEY;

  try {
    posthog = new PostHog(apiKey, {
      host: process.env[POSTHOG_HOST_ENV]?.trim() || DEFAULT_POSTHOG_HOST,
    });
  } catch (error) {
    logger.error("Failed to initialize PostHog for MCP telemetry", error);
    posthog = null;
  }
  return posthog;
}

function getAnonymousDistinctId(): string {
  if (anonymousDistinctId === undefined) {
    anonymousDistinctId = randomUUID();
  }
  return anonymousDistinctId;
}

export function captureEvent(
  event: string,
  properties: Record<string, string | number | boolean>,
): void {
  const client = getPosthog();
  if (!client) return;
  try {
    client.capture({
      distinctId: getAnonymousDistinctId(),
      event,
      properties: {
        ...properties,
        // Do not create PostHog person profiles; we only need aggregate event counts.
        $process_person_profile: false,
      },
    });
  } catch (error) {
    logger.error(`Failed to capture ${event} telemetry event`, error);
  }
}

export async function flushTelemetry(): Promise<void> {
  const client = getPosthog();
  if (!client) return;
  try {
    await client.flush();
  } catch (error) {
    logger.error("Failed to flush MCP telemetry events", error);
  }
}

export type ToolCallStatus = "success" | "soft_fail" | "failed" | "aborted";

const failureCategories = [
  "validation",
  "auth",
  "not_found",
  "timeout",
  "connection",
  "internal",
] as const;
export type FailureCategory = (typeof failureCategories)[number];

export interface ToolCallTelemetryProperties {
  tool_name: string;
  status: ToolCallStatus;
  duration_ms: number;
  failure_category?: FailureCategory;
  transport: string;
  server_version: string;
  mcp_client_name: string;
  mcp_client_version: string;
  mcp_protocol_version: string;
}

const SOFT_FAIL_MARKERS: ReadonlyArray<readonly [RegExp, FailureCategory]> = [
  [/validation/i, "validation"],
  [/invalid/i, "validation"],
  [/not allowed/i, "validation"],
  [/exceeds (the )?maximum|too large/i, "validation"],
  [/not found/i, "not_found"],
  [/does not exist/i, "not_found"],
  [/timeout|timed out/i, "timeout"],
  [/connection|failed to connect/i, "connection"],
  [/unauthorized|forbidden|denied|permission/i, "auth"],
];

export function classifyFailure(text: string): FailureCategory {
  for (const [pattern, category] of SOFT_FAIL_MARKERS) {
    if (pattern.test(text)) return category;
  }
  return "internal";
}

export function classifyToolResult(
  result: CallToolResult | undefined,
  thrownError: unknown,
  aborted: boolean,
): { status: ToolCallStatus; failure_category?: FailureCategory } {
  if (aborted) return { status: "aborted" };

  if (thrownError !== undefined) {
    return { status: "failed", failure_category: "internal" };
  }

  if (result?.isError) {
    return { status: "failed", failure_category: "internal" };
  }

  const structuredError = extractStructuredError(result);
  if (structuredError !== undefined && structuredError.length > 0) {
    return classifyFailureText(structuredError);
  }

  const text = extractTextBlock(result);
  if (text !== undefined && text.length > 0 && isErrorText(text)) {
    return classifyFailureText(text);
  }

  return { status: "success" };
}

function classifyFailureText(text: string): {
  status: ToolCallStatus;
  failure_category?: FailureCategory;
} {
  const failure_category = classifyFailure(text);
  const status = failure_category === "internal" ? "failed" : "soft_fail";
  return { status, failure_category };
}

function extractStructuredError(
  result: CallToolResult | undefined,
): string | undefined {
  if (!result?.structuredContent) return undefined;
  const value = (result.structuredContent as Record<string, unknown>)["error"];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

function extractTextBlock(
  result: CallToolResult | undefined,
): string | undefined {
  for (const block of result?.content ?? []) {
    if (block.type === "text" && block.text.length > 0) return block.text;
  }
  return undefined;
}

function isErrorText(text: string): boolean {
  const trimmed = text.trim();
  if (trimmed.length === 0) return false;
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      return typeof parsed.error === "string";
    } catch {
      // Fall through to keyword detection for non-JSON text.
    }
  }
  return /\b(error|failed|exception|not found|could not|couldn't|unable)\b/i.test(
    trimmed,
  );
}

export type ClientContext = {
  mcp_client_name: string;
  mcp_client_version: string;
  mcp_protocol_version: string;
};

export function getClientContext(ctx: ServerContext): ClientContext {
  const envelope = ctx.mcpReq.envelope;
  const clientInfo = envelope?.[CLIENT_INFO_META_KEY];
  const protocolVersion = envelope?.[PROTOCOL_VERSION_META_KEY];
  return {
    mcp_client_name:
      (typeof clientInfo === "object" &&
        clientInfo !== null &&
        "name" in clientInfo &&
        typeof clientInfo.name === "string" &&
        clientInfo.name) ||
      "",
    mcp_client_version:
      (typeof clientInfo === "object" &&
        clientInfo !== null &&
        "version" in clientInfo &&
        typeof clientInfo.version === "string" &&
        clientInfo.version) ||
      "",
    mcp_protocol_version:
      (typeof protocolVersion === "string" && protocolVersion) || "",
  };
}

export function trackToolCall(params: {
  toolName: string;
  startTime: number;
  status: ToolCallStatus;
  failureCategory?: FailureCategory;
  transport: string;
  serverVersion: string;
  clientContext: ClientContext;
}): void {
  const {
    toolName,
    startTime,
    status,
    failureCategory,
    transport,
    serverVersion,
    clientContext,
  } = params;
  captureEvent("MCP Tool Call", {
    tool_name: toolName,
    status,
    duration_ms: Date.now() - startTime,
    ...(failureCategory !== undefined && { failure_category: failureCategory }),
    transport,
    server_version: serverVersion,
    ...clientContext,
  });
}

export function trackReportIssue(params: {
  transport: string;
  serverVersion: string;
  clientContext: ClientContext;
}): void {
  const { transport, serverVersion, clientContext } = params;
  // Signal-only event: the message body is user-supplied free text and is
  // intentionally not sent to PostHog (see issue privacy requirements).
  captureEvent("MCP Report Issue", {
    transport,
    server_version: serverVersion,
    ...clientContext,
  });
}
