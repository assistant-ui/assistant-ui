export type DisplayMode = "inline" | "fullscreen" | "pip";

export type Theme = "light" | "dark";

export type WidgetState = Record<string, unknown> | null;

export interface DeviceInfo {
  type: "mobile" | "tablet" | "desktop";
}

export interface DeviceCapabilities {
  hover: boolean;
  touch: boolean;
}

export interface UserAgent {
  device: DeviceInfo;
  capabilities: DeviceCapabilities;
}

export interface SafeAreaInsets {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export interface SafeArea {
  insets: SafeAreaInsets;
}

export interface AUIGlobals {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: WidgetState;
  userAgent: UserAgent;
  safeArea: SafeArea;
}

export interface CallToolResponse {
  content?: string | Array<{ type: string; text?: string }>;
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ModalOptions {
  title?: string;
  params?: Record<string, unknown>;
}

export interface AUIAPI {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  setWidgetState: (state: WidgetState) => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  requestDisplayMode: (args: {
    mode: DisplayMode;
  }) => Promise<{ mode: DisplayMode }>;
  requestModal: (options: ModalOptions) => Promise<void>;
  requestClose: () => void;
  openExternal: (payload: { href: string }) => void;
  notifyIntrinsicHeight: (height: number) => void;
}

export type WindowAUI = AUIGlobals & AUIAPI;

export const SET_GLOBALS_EVENT_TYPE = "aui:set_globals" as const;

export type ParentToIframeMessage =
  | { type: "AUI_SET_GLOBALS"; globals: AUIGlobals }
  | {
      type: "AUI_METHOD_RESPONSE";
      id: string;
      result?: unknown;
      error?: string;
    };

export interface IframeToParentMessage {
  type: "AUI_METHOD_CALL";
  id: string;
  method: keyof AUIAPI;
  args: unknown[];
}

export interface LegacyRemoteMessage {
  type: "ready" | "action" | "addResult" | "resize" | "error";
  payload?: unknown;
}
