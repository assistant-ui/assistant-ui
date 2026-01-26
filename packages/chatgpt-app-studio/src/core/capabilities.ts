import type { Platform, DisplayMode } from "./types";

export interface HostCapabilities {
  platform: Platform;

  // Core (always available on supported platforms)
  callTool: boolean;
  openLink: boolean;

  // Display
  displayModes: DisplayMode[];
  sizeReporting: boolean;
  closeWidget: boolean;

  // Messaging
  sendMessage: boolean;
  modal: boolean;

  // Files (ChatGPT only)
  fileUpload: boolean;
  fileDownload: boolean;

  // State
  widgetState: boolean;
  modelContext: boolean;

  // Advanced (MCP features)
  logging: boolean;
  partialToolInput: boolean;
  toolCancellation: boolean;
  teardown: boolean;
}

export const CHATGPT_CAPABILITIES: HostCapabilities = {
  platform: "chatgpt",

  callTool: true,
  openLink: true,

  displayModes: ["pip", "inline", "fullscreen"],
  sizeReporting: true,
  closeWidget: true,

  sendMessage: true,
  modal: true,

  fileUpload: true,
  fileDownload: true,

  widgetState: true,
  modelContext: false,

  logging: false,
  partialToolInput: false,
  toolCancellation: false,
  teardown: false,
};

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
