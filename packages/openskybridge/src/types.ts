// State types
export type DisplayMode = "pip" | "inline" | "fullscreen";
export type Theme = "light" | "dark";
export type DeviceType = "mobile" | "tablet" | "desktop" | "unknown";

export type SafeArea = {
  insets: { top: number; bottom: number; left: number; right: number };
};

export type UserAgent = {
  device: { type: DeviceType };
  capabilities: { hover: boolean; touch: boolean };
};

export type CallToolResponse = {
  content: unknown;
};

export interface SkybridgeState {
  theme: Theme;
  userAgent: UserAgent;
  locale: string;
  maxHeight: number;
  displayMode: DisplayMode;
  safeArea: SafeArea;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
}

// Controller - passed from OpenSkybridge to runtime
export interface SkybridgeController {
  postMessage(data: unknown): void;
  onMessage(handler: (data: unknown) => void): () => void;
}

// Callbacks - host handlers for method calls
export interface SkybridgeCallbacks {
  onCallTool?:
    | ((name: string, args: Record<string, unknown>) => Promise<CallToolResponse>)
    | undefined;
  onRequestClose?: (() => void) | undefined;
  onSendFollowUpMessage?: ((args: { prompt: string }) => Promise<void>) | undefined;
  onOpenExternal?: ((payload: { href: string }) => void) | undefined;
  onRequestDisplayMode?:
    | ((args: { mode: DisplayMode }) => Promise<{ mode: DisplayMode }>)
    | undefined;
  onSetWidgetState?: ((state: Record<string, unknown>) => Promise<void>) | undefined;
  /** Internal callback for iframe height changes */
  onResize?: ((height: number) => void) | undefined;
}

// Connection - returned by runtime.connect()
export interface SkybridgeConnection {
  updateState(state: Partial<SkybridgeState>): void;
  disconnect(): void;
}

// Runtime - the abstraction layer
export interface SkybridgeRuntime {
  runtimeCode: string;
  connect(
    controller: SkybridgeController,
    callbacks: SkybridgeCallbacks
  ): SkybridgeConnection;
}
