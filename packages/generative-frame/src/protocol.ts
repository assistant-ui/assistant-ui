export const GENFRAME_PROTOCOL_VERSION = "2026-01-26";

/** Window messages exchanged once, before the private port exists. */
export const READY_MESSAGE = "genframe:ready";
export const INIT_MESSAGE = "genframe:init";

export const METHODS = {
  // host → frame
  write: "genframe/write",
  end: "genframe/end",
  replace: "genframe/replace",
  screenshot: "genframe/screenshot",
  inspect: "genframe/inspect",
  clearStorage: "genframe/clear-storage",
  hostContextChanged: "ui/notifications/host-context-changed",
  toolInputPartial: "ui/notifications/tool-input-partial",
  toolInput: "ui/notifications/tool-input",
  toolResult: "ui/notifications/tool-result",
  // frame → host
  ready: "genframe/ready",
  initialize: "ui/initialize",
  initialized: "ui/notifications/initialized",
  sizeChanged: "ui/notifications/size-changed",
  openLink: "ui/open-link",
  message: "ui/message",
  callTool: "tools/call",
  requestDisplayMode: "ui/request-display-mode",
  updateModelContext: "ui/update-model-context",
  widgetState: "genframe/widget-state",
  log: "genframe/log",
  error: "genframe/error",
} as const;

export type WidgetKind = "html" | "svg";

export type ColorScheme = "light" | "dark";

export type DisplayMode = "inline" | "fullscreen" | "pip";

/** The MCP Apps host context, plus the fields this package adds. */
export type HostContext = {
  theme?: ColorScheme;
  styles?: { variables?: Record<string, string> };
  displayMode?: DisplayMode;
  availableDisplayModes?: DisplayMode[];
  locale?: string;
  platform?: "web" | "desktop" | "mobile";
  containerDimensions?: { width?: number; maxHeight?: number };
  [key: string]: unknown;
};

export type InitMessage = {
  type: typeof INIT_MESSAGE;
  context: HostContext;
};

export type WidgetErrorKind =
  | "error"
  | "unhandledrejection"
  | "csp"
  | "resource"
  | "script";

export type WidgetError = {
  kind: WidgetErrorKind;
  message: string;
  source?: string;
  line?: number;
  column?: number;
  stack?: string;
};

export type ConsoleLevel = "log" | "info" | "warn" | "error" | "debug";

export type ConsoleEntry = {
  level: ConsoleLevel;
  message: string;
};

export type WidgetSize = { width: number; height: number };

export type EndResult = {
  size: WidgetSize;
  blank: boolean;
  errorCount: number;
};

export type ClearStorageResult = {
  /** The storage kinds that were cleared; a kind the browser lacks is left out. */
  cleared: string[];
};

export type FrameInspection = {
  kind: WidgetKind;
  ended: boolean;
  size: WidgetSize;
  blank: boolean;
  errors: WidgetError[];
  console: ConsoleEntry[];
};

export type ScreenshotOptions = {
  /** Device pixel ratio of the capture. Defaults to the frame's, capped at 2. */
  scale?: number;
  /** CSS color painted behind the widget. Defaults to `--color-background`. */
  background?: string;
};

const SVG_START = /^\s*(?:<\?xml[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<svg[\s>/]/i;

/** Classifies widget code: SVG when it starts with an `<svg` element, otherwise HTML. */
export function detectWidgetKind(code: string): WidgetKind {
  return SVG_START.test(code) ? "svg" : "html";
}
