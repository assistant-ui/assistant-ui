import type { ExtendedBridge } from "../core/bridge";
import type { HostCapabilities } from "../core/capabilities";

/**
 * ChatGPT-only extensions.
 *
 * ChatGPT is an MCP Apps host (standard `ui/*` bridge). It may also expose
 * optional extras via `window.openai` (widget state, file APIs, host modals…).
 *
 * This module intentionally treats `window.openai` as an *optional* layer:
 * - Never required for MCP Apps interoperability
 * - Always feature-detected before use
 */

export type ChatGPTExtensions = {
  // --- Context/state (read-only) ---
  theme?: "light" | "dark";
  locale?: string;
  displayMode?: "pip" | "inline" | "fullscreen";
  previousDisplayMode?: "pip" | "inline" | "fullscreen" | null;
  maxHeight?: number;
  safeArea?: {
    insets: { top: number; bottom: number; left: number; right: number };
  };
  userAgent?: Record<string, unknown>;
  view?: {
    mode: "modal" | "inline";
    params: Record<string, unknown> | null;
  } | null;
  userLocation?: Record<string, unknown> | null;

  toolInput?: Record<string, unknown>;
  toolOutput?: Record<string, unknown> | null;
  toolResponseMetadata?: Record<string, unknown> | null;

  widgetState?: Record<string, unknown> | null;
  setWidgetState?: (state: Record<string, unknown> | null) => void;

  // --- APIs ---
  callTool?: (name: string, args: Record<string, unknown>) => Promise<unknown>;
  sendFollowUpMessage?: (args: { prompt: string }) => Promise<void>;
  openExternal?: (payload: { href: string }) => void;
  notifyIntrinsicHeight?: (height: number) => void;
  requestDisplayMode?: (args: { mode: string }) => Promise<{ mode: string }>;

  uploadFile?: (file: File) => Promise<{ fileId: string }>;
  getFileDownloadUrl?: (args: {
    fileId: string;
  }) => Promise<{ downloadUrl: string }>;

  setOpenInAppUrl?: (args: { href: string }) => void;
  requestCheckout?: (...args: unknown[]) => unknown;
  requestClose?: () => void;
  requestModal?: (options: Record<string, unknown>) => Promise<void>;
};

function getChatGPTExtensions(): ChatGPTExtensions | null {
  if (typeof window === "undefined") return null;
  const openai = (window as unknown as Record<string, unknown>)["openai"];
  if (!openai || typeof openai !== "object") return null;
  return openai as ChatGPTExtensions;
}

function withExtensionsCapabilities(
  base: HostCapabilities,
  openai: ChatGPTExtensions,
): HostCapabilities {
  return {
    ...base,
    widgetState: typeof openai.setWidgetState === "function",
    fileUpload: typeof openai.uploadFile === "function",
    fileDownload: typeof openai.getFileDownloadUrl === "function",
    closeWidget: typeof openai.requestClose === "function",
    modal: typeof openai.requestModal === "function",
  };
}

/**
 * Wraps an MCP-first bridge with ChatGPT-only extensions when `window.openai`
 * exists.
 *
 * Note: this function mutates `bridge` in-place so class instances preserve
 * prototype methods.
 *
 * The returned bridge:
 * - Delegates all MCP behavior to `bridge`
 * - Adds ChatGPT-only helpers (widget state, file APIs, modals) when available
 *
 * @param bridge - Base MCP bridge to extend.
 * @returns The same `bridge` instance with ChatGPT-only extensions attached
 * when available.
 */
export function withChatGPTExtensions(bridge: ExtendedBridge): ExtendedBridge {
  const openai = getChatGPTExtensions();
  if (!openai) return bridge;

  // Mutate in-place so class instances (e.g. MCPBridge) keep their prototype
  // methods. Spreading a class instance would drop methods defined on the
  // prototype, breaking core bridge behavior.
  (bridge as unknown as { capabilities: HostCapabilities }).capabilities =
    withExtensionsCapabilities(bridge.capabilities, openai);

  if (typeof openai.setWidgetState === "function") {
    bridge.setWidgetState = (state) => openai.setWidgetState?.(state);
  }

  bridge.getWidgetState = () =>
    (openai.widgetState ?? null) as Record<string, unknown> | null;

  if (typeof openai.uploadFile === "function") {
    bridge.uploadFile = (file) => openai.uploadFile!(file);
  }

  if (typeof openai.getFileDownloadUrl === "function") {
    bridge.getFileDownloadUrl = (fileId) =>
      openai.getFileDownloadUrl!({ fileId });
  }

  if (typeof openai.requestClose === "function") {
    bridge.requestClose = () => openai.requestClose?.();
  }

  if (typeof openai.requestModal === "function") {
    bridge.requestModal = (options) => openai.requestModal!(options);
  }

  return bridge;
}

declare global {
  interface Window {
    /**
     * ChatGPT-only extension layer. Optional.
     *
     * Prefer using the MCP Apps bridge (`ui/*`) for core functionality.
     */
    openai?: ChatGPTExtensions;
  }
}
