import type { Platform } from "../core/types";

/**
 * Markers used to detect MCP host environment.
 */
const MCP_MARKERS = {
  URL_PARAM: "mcp-host",
  WINDOW_PROP: "__MCP_HOST__",
  DATA_ATTR: "data-mcp-host",
} as const;

/**
 * Debug mode flag. Set `window.__MCP_APP_STUDIO_DEBUG__ = true` to enable
 * verbose logging of platform detection.
 */
const DEBUG_KEY = "__MCP_APP_STUDIO_DEBUG__";

function isDebugMode(): boolean {
  if (typeof window === "undefined") return false;
  return (window as unknown as Record<string, unknown>)[DEBUG_KEY] === true;
}

function debugLog(message: string, data?: Record<string, unknown>): void {
  if (!isDebugMode()) return;
  console.log(`[mcp-app-studio] ${message}`, data ?? "");
}

/**
 * Detection result with detailed information about what was checked.
 */
export interface DetectionResult {
  /** The detected platform */
  platform: Platform;
  /** What marker was found (if any) */
  detectedBy: string | null;
  /** All markers that were checked */
  checks: {
    windowOpenai: boolean;
    mcpUrlParam: boolean;
    mcpWindowProp: boolean;
    mcpDataAttr: boolean;
  };
}

/**
 * Detects the current platform with detailed results.
 * Useful for debugging platform detection issues.
 *
 * @returns Detection result with platform and diagnostic info
 *
 * @example
 * ```ts
 * const result = detectPlatformDetailed();
 * console.log('Platform:', result.platform);
 * console.log('Detected by:', result.detectedBy);
 * console.log('Checks:', result.checks);
 * ```
 */
export function detectPlatformDetailed(): DetectionResult {
  const checks = {
    windowOpenai: false,
    mcpUrlParam: false,
    mcpWindowProp: false,
    mcpDataAttr: false,
  };

  if (typeof window === "undefined") {
    debugLog("detectPlatform: No window object (SSR/Node.js)");
    return { platform: "unknown", detectedBy: null, checks };
  }

  // ChatGPT-only extension surface. Useful for diagnostics, but *not* a host marker.
  if ((window as unknown as Record<string, unknown>)["openai"]) {
    checks.windowOpenai = true;
    debugLog("detectPlatform: Found window.openai (extensions)");
  }

  // Check for MCP markers
  try {
    const params = new URLSearchParams(window.location.search);
    if (params.has(MCP_MARKERS.URL_PARAM)) {
      checks.mcpUrlParam = true;
      debugLog("detectPlatform: Found MCP URL param", {
        param: MCP_MARKERS.URL_PARAM,
        platform: "mcp",
      });
      return {
        platform: "mcp",
        detectedBy: `URL param: ${MCP_MARKERS.URL_PARAM}`,
        checks,
      };
    }
  } catch {
    debugLog("detectPlatform: URL parsing failed");
  }

  if (MCP_MARKERS.WINDOW_PROP in window) {
    checks.mcpWindowProp = true;
    debugLog("detectPlatform: Found MCP window property", {
      prop: MCP_MARKERS.WINDOW_PROP,
      platform: "mcp",
    });
    return {
      platform: "mcp",
      detectedBy: `window.${MCP_MARKERS.WINDOW_PROP}`,
      checks,
    };
  }

  try {
    const frameElement = window.frameElement;
    if (frameElement?.hasAttribute(MCP_MARKERS.DATA_ATTR)) {
      checks.mcpDataAttr = true;
      debugLog("detectPlatform: Found MCP data attribute", {
        attr: MCP_MARKERS.DATA_ATTR,
        platform: "mcp",
      });
      return {
        platform: "mcp",
        detectedBy: `iframe: ${MCP_MARKERS.DATA_ATTR}`,
        checks,
      };
    }
  } catch {
    debugLog("detectPlatform: Frame element access failed (cross-origin)");
  }

  debugLog("detectPlatform: No platform markers found", { checks });
  return { platform: "unknown", detectedBy: null, checks };
}

/**
 * Detects the current platform the widget is running on.
 *
 * Host detection:
 * - URL has `?mcp-host` param → MCP
 * - `window.__MCP_HOST__` exists → MCP
 * - iframe has `data-mcp-host` attribute → MCP
 * - None of the above → unknown
 *
 * Note: `window.openai` is a ChatGPT-only *extensions* layer, not the MCP host protocol.
 *
 * **Debugging tip:** Set `window.__MCP_APP_STUDIO_DEBUG__ = true` before
 * loading your widget to see detailed detection logs in the console.
 *
 * @returns The detected platform: "mcp" or "unknown"
 *
 * @example
 * ```ts
 * const platform = detectPlatform();
 * if (platform === 'unknown') {
 *   console.log('Running in development mode or unsupported host');
 * }
 * ```
 */
export function detectPlatform(): Platform {
  return detectPlatformDetailed().platform;
}

/**
 * Returns true if ChatGPT-only extensions are available (`window.openai`).
 *
 * @example
 * ```ts
 * if (hasChatGPTExtensions()) {
 *   // Use ChatGPT-only extensions (e.g. widgetState, file upload)
 * }
 * ```
 */
export function hasChatGPTExtensions(): boolean {
  if (typeof window === "undefined") return false;
  return Boolean((window as unknown as Record<string, unknown>)["openai"]);
}

/**
 * Returns true if running inside an MCP host (e.g., Claude Desktop).
 *
 * @example
 * ```ts
 * if (isMCP()) {
 *   // Use MCP-specific features
 * }
 * ```
 */
export function isMCP(): boolean {
  return detectPlatform() === "mcp";
}

/**
 * Enable debug mode for platform detection.
 * Logs detailed information about what markers are being checked.
 *
 * @example
 * ```ts
 * import { enableDebugMode } from 'mcp-app-studio';
 *
 * // Enable before your app initializes
 * enableDebugMode();
 *
 * // Now detection will log to console
 * const platform = detectPlatform();
 * ```
 */
export function enableDebugMode(): void {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[DEBUG_KEY] = true;
    console.log(
      "[mcp-app-studio] Debug mode enabled. Platform detection will log to console.",
    );
  }
}

/**
 * Disable debug mode for platform detection.
 */
export function disableDebugMode(): void {
  if (typeof window !== "undefined") {
    (window as unknown as Record<string, unknown>)[DEBUG_KEY] = false;
  }
}
