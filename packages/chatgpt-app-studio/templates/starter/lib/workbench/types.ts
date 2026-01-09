export type DisplayMode = "pip" | "inline" | "fullscreen";
export type Theme = "light" | "dark";
export type DeviceType = "mobile" | "tablet" | "desktop" | "resizable";

export type WidgetState = Record<string, unknown> | null;

export interface UserLocation {
  city?: string;
  region?: string;
  country?: string;
  timezone?: string;
  longitude?: number;
  latitude?: number;
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

export interface DeviceInfo {
  type: DeviceType;
}

export interface DeviceCapabilities {
  hover: boolean;
  touch: boolean;
}

export interface UserAgent {
  device: DeviceInfo;
  capabilities: DeviceCapabilities;
}

export interface View {
  mode: "modal" | "inline";
  params: Record<string, unknown> | null;
}

export interface OpenAIGlobals {
  theme: Theme;
  locale: string;
  displayMode: DisplayMode;
  previousDisplayMode: DisplayMode | null;
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
  widgetState: WidgetState;
  userAgent: UserAgent;
  safeArea: SafeArea;
  view: View | null;
  userLocation: UserLocation | null;
}

export interface CallToolResponse {
  structuredContent?: Record<string, unknown>;
  content?: string | Array<{ type: string; text?: string }>;
  _meta?: Record<string, unknown>;
  isError?: boolean;
}

export interface ModalOptions {
  title?: string;
  params?: Record<string, unknown>;
  anchor?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface UploadFileResponse {
  fileId: string;
}

export interface GetFileDownloadUrlResponse {
  downloadUrl: string;
}

export interface OpenAIAPI {
  callTool: (
    name: string,
    args: Record<string, unknown>,
  ) => Promise<CallToolResponse>;
  requestClose: () => void;
  sendFollowUpMessage: (args: { prompt: string }) => Promise<void>;
  openExternal: (payload: { href: string }) => void;
  requestDisplayMode: (args: { mode: DisplayMode }) => Promise<{
    mode: DisplayMode;
  }>;
  setWidgetState: (state: WidgetState) => void;
  notifyIntrinsicHeight: (height: number) => void;
  requestModal: (options: ModalOptions) => Promise<void>;
  uploadFile: (file: File) => Promise<UploadFileResponse>;
  getFileDownloadUrl: (args: {
    fileId: string;
  }) => Promise<GetFileDownloadUrlResponse>;
}

export type WindowOpenAI = OpenAIGlobals & OpenAIAPI;

export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals" as const;

export interface SetGlobalsEventDetail {
  globals: Partial<OpenAIGlobals>;
}

export type ParentToIframeMessage =
  | { type: "OPENAI_SET_GLOBALS"; globals: OpenAIGlobals }
  | {
      type: "OPENAI_METHOD_RESPONSE";
      id: string;
      result?: unknown;
      error?: string;
    };

export interface IframeToParentMessage {
  type: "OPENAI_METHOD_CALL";
  id: string;
  method: keyof OpenAIAPI;
  args: unknown[];
}

export type ConsoleEntryType =
  | "callTool"
  | "setWidgetState"
  | "requestDisplayMode"
  | "sendFollowUpMessage"
  | "requestClose"
  | "openExternal"
  | "notifyIntrinsicHeight"
  | "requestModal"
  | "uploadFile"
  | "getFileDownloadUrl"
  | "event";

export interface ConsoleEntry {
  id: string;
  timestamp: Date;
  type: ConsoleEntryType;
  method: string;
  args?: unknown;
  result?: unknown;
}

export type ComponentCategory = "cards" | "lists" | "forms" | "data";

export interface WorkbenchComponent {
  id: string;
  label: string;
  description: string;
  category: ComponentCategory;
  getBundle: () => string;
  defaultToolInput: Record<string, unknown>;
  defaultToolOutput: Record<string, unknown>;
}

export interface DevicePreset {
  width: number | "100%";
  height: number | "100%";
  userAgent: UserAgent;
}

export const DEVICE_PRESETS: Record<DeviceType, DevicePreset> = {
  mobile: {
    width: 375,
    height: 667,
    userAgent: {
      device: { type: "mobile" },
      capabilities: { hover: false, touch: true },
    },
  },
  tablet: {
    width: 768,
    height: 1024,
    userAgent: {
      device: { type: "tablet" },
      capabilities: { hover: false, touch: true },
    },
  },
  desktop: {
    width: "100%",
    height: "100%",
    userAgent: {
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    },
  },
  resizable: {
    width: "100%",
    height: "100%",
    userAgent: {
      device: { type: "desktop" },
      capabilities: { hover: true, touch: false },
    },
  },
};

export const LOCALE_OPTIONS = [
  { value: "en-US", label: "English (US)" },
  { value: "en-GB", label: "English (UK)" },
  { value: "es-ES", label: "Spanish (Spain)" },
  { value: "fr-FR", label: "French (France)" },
  { value: "de-DE", label: "German (Germany)" },
  { value: "ja-JP", label: "Japanese" },
  { value: "zh-CN", label: "Chinese (Simplified)" },
  { value: "pt-BR", label: "Portuguese (Brazil)" },
] as const;

export type ResponseMode = "success" | "error" | "hang";

export interface ToolSimulationConfig {
  responseMode: ResponseMode;
  responseData: Record<string, unknown>;
}

export interface SimulationState {
  selectedTool: string | null;
  tools: Record<string, ToolSimulationConfig>;
}

export const DEFAULT_TOOL_CONFIG: ToolSimulationConfig = {
  responseMode: "success",
  responseData: { success: true },
};

export const DEFAULT_SIMULATION_STATE: SimulationState = {
  selectedTool: null,
  tools: {},
};
