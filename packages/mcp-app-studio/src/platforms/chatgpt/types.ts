export * from "../../core/types";

export interface ChatGPTGlobals {
  theme: "light" | "dark";
  locale: string;
  displayMode: "pip" | "inline" | "fullscreen";
  previousDisplayMode: "pip" | "inline" | "fullscreen" | null;
  maxHeight: number;
  toolInput: Record<string, unknown>;
  toolOutput: Record<string, unknown> | null;
  toolResponseMetadata: Record<string, unknown> | null;
  widgetState: Record<string, unknown> | null;
  userAgent: {
    device: { type: "mobile" | "tablet" | "desktop" | "resizable" };
    capabilities: { hover: boolean; touch: boolean };
  };
  safeArea: {
    insets: { top: number; bottom: number; left: number; right: number };
  };
  view: {
    mode: "modal" | "inline";
    params: Record<string, unknown> | null;
  } | null;
  userLocation: {
    city?: string;
    region?: string;
    country?: string;
    timezone?: string;
    longitude?: number;
    latitude?: number;
  } | null;
}

declare global {
  interface Window {
    openai?: ChatGPTGlobals & {
      callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
      setWidgetState(state: Record<string, unknown> | null): void;
      requestDisplayMode(args: { mode: string }): Promise<{ mode: string }>;
      notifyIntrinsicHeight(height: number): void;
      requestClose(): void;
      sendFollowUpMessage(args: { prompt: string }): Promise<void>;
      openExternal(payload: { href: string }): void;
      uploadFile(file: File): Promise<{ fileId: string }>;
      getFileDownloadUrl(args: {
        fileId: string;
      }): Promise<{ downloadUrl: string }>;
      requestModal(options: unknown): Promise<void>;
    };
  }
}
