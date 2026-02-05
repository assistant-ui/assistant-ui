import type { Platform, DisplayMode } from "./types";

/**
 * Feature keys that can be checked with `useFeature()` hook.
 * These correspond to boolean capabilities in `HostCapabilities`.
 */
export type FeatureKey =
  | "callTool"
  | "openLink"
  | "sizeReporting"
  | "closeWidget"
  | "sendMessage"
  | "modal"
  | "fileUpload"
  | "fileDownload"
  | "widgetState"
  | "modelContext"
  | "logging"
  | "partialToolInput"
  | "toolCancellation"
  | "teardown";

/**
 * Capabilities supported by the host platform.
 * Use `useCapabilities()` hook to access these at runtime.
 *
 * @example
 * ```tsx
 * const capabilities = useCapabilities();
 * if (capabilities?.widgetState) {
 *   // ChatGPT extensions (window.openai)
 * }
 * ```
 */
export interface HostCapabilities {
  /** The platform this capability set is for */
  platform: Platform;

  /** Can call tools registered with the host */
  callTool: boolean;
  /** Can open external links */
  openLink: boolean;

  /** Supported display modes */
  displayModes: DisplayMode[];
  /** Can report widget size to host */
  sizeReporting: boolean;
  /** Can request widget close */
  closeWidget: boolean;

  /** Can send messages to conversation */
  sendMessage: boolean;
  /** Can request modal dialogs */
  modal: boolean;

  /** Can upload files (ChatGPT extensions only) */
  fileUpload: boolean;
  /** Can download files (ChatGPT extensions only) */
  fileDownload: boolean;

  /** Can persist widget state (ChatGPT extensions only) */
  widgetState: boolean;
  /** Can update model context (MCP only) */
  modelContext: boolean;

  /** Structured logging support (MCP only) */
  logging: boolean;
  /** Partial/streaming tool input (MCP only) */
  partialToolInput: boolean;
  /** Tool cancellation support (MCP only) */
  toolCancellation: boolean;
  /** Teardown notification support (MCP only) */
  teardown: boolean;
}

/**
 * Capabilities available on MCP hosts (e.g., Claude Desktop).
 *
 * Notable features:
 * - `modelContext`: Update model context dynamically
 * - `logging`: Structured logging to host
 * - `partialToolInput`: Streaming input support
 * - `toolCancellation`: Handle cancelled tool calls
 * - `teardown`: Cleanup notification
 */
export const MCP_CAPABILITIES: HostCapabilities = {
  platform: "mcp",

  callTool: true,
  openLink: true,

  displayModes: ["inline", "fullscreen", "pip"],
  sizeReporting: true,
  closeWidget: false,

  sendMessage: true,
  modal: false,

  fileUpload: false,
  fileDownload: false,

  widgetState: false,
  modelContext: true,

  logging: true,
  partialToolInput: true,
  toolCancellation: true,
  teardown: true,
};

/**
 * Check if a specific feature is available.
 *
 * @param capabilities - The host capabilities object
 * @param feature - The feature key to check
 * @returns Whether the feature is available
 *
 * @example
 * ```ts
 * if (hasFeature(capabilities, 'widgetState')) {
 *   // Safe to use widget state
 * }
 * ```
 */
export function hasFeature(
  capabilities: HostCapabilities | null,
  feature: FeatureKey,
): boolean {
  if (!capabilities) return false;
  return capabilities[feature] === true;
}
