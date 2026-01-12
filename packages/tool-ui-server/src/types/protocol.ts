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

export interface UserLocation {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  latitude?: number;
  longitude?: number;
}

export interface ToolResponseMetadata {
  widgetSessionId?: string;
  closeWidget?: boolean;
  prefersBorder?: boolean;
  [key: string]: unknown;
}

export interface View {
  mode: "modal" | "inline";
  params: Record<string, unknown> | null;
}

// Tool invocation messages for ChatGPT Apps SDK compatibility
export interface ToolInvocationMessages {
  invoking?: string; // Max 64 characters
  invoked?: string; // Max 64 characters
}

// Tool metadata for ChatGPT Apps SDK compatibility
export interface ToolMetadata {
  visibility?: "private" | "public";
  widgetAccessible?: boolean;
  fileParams?: string[];
}

// Tool annotations aligned with ChatGPT Apps SDK API
export interface ToolAnnotations {
  readOnlyHint?: boolean;
  destructiveHint?: boolean;
  completionMessage?: string;
}

export interface AUIGlobals {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  previousDisplayMode: DisplayMode | null;
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  widgetState: WidgetState;
  userAgent: UserAgent;
  safeArea: SafeArea;
  userLocation: UserLocation | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  view: View | null;
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

export interface UploadFileResponse {
  fileId: string;
}

export interface GetFileDownloadUrlResponse {
  downloadUrl: string;
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
  uploadFile: (file: File) => Promise<UploadFileResponse>;
  getFileDownloadUrl: (args: {
    fileId: string;
  }) => Promise<GetFileDownloadUrlResponse>;
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
