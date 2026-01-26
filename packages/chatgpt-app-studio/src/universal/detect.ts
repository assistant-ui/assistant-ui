import type { Platform } from "../core/types";

const MCP_MARKERS = {
  URL_PARAM: "mcp-host",
  WINDOW_PROP: "__MCP_HOST__",
  DATA_ATTR: "data-mcp-host",
} as const;

export function detectPlatform(): Platform {
  if (typeof window === "undefined") {
    return "unknown";
  }

  if (window.openai) {
    return "chatgpt";
  }

  if (isMCPEnvironment()) {
    return "mcp";
  }

  return "unknown";
}

function isMCPEnvironment(): boolean {
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(MCP_MARKERS.URL_PARAM)) {
      return true;
    }
  } catch {
    // URL parsing failed
  }

  if (MCP_MARKERS.WINDOW_PROP in window) {
    return true;
  }

  try {
    const frameElement = window.frameElement;
    if (frameElement?.hasAttribute(MCP_MARKERS.DATA_ATTR)) {
      return true;
    }
  } catch {
    // Cross-origin access may throw
  }

  return false;
}

export function isChatGPT(): boolean {
  return detectPlatform() === "chatgpt";
}

export function isMCP(): boolean {
  return detectPlatform() === "mcp";
}
