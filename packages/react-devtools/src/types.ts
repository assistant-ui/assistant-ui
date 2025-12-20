import type { NormalizedTool } from "./utils/toolNormalization";

// Core types for DevTools UI
export type TabType = "state" | "events" | "context";
export type ViewMode = "raw" | "preview";

// Types used by serialization utility
export interface SerializedModelContext {
  system?: string;
  tools?: NormalizedTool[];
  callSettings?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

// Protocol constants
export const DEVTOOLS_PROTOCOL = "assistant-ui-devtools";
export const DEVTOOLS_PROTOCOL_VERSION = 1;

// Generic envelope
export type DevToolsMessage<T> = {
  protocol: typeof DEVTOOLS_PROTOCOL;
  version: typeof DEVTOOLS_PROTOCOL_VERSION;
  payload: T;
};

export type SubscriptionPayload = {
  type: "subscription";
  data: {
    apiList?: boolean;
    apis?: number[];
  };
};

export type ClearEventsPayload = {
  type: "clearEvents";
  data: {
    apiId: number;
  };
};

export type UpdatePayload = {
  type: "update";
  data: {
    apiList?: Array<{ apiId: number }>;
    apis?: Array<{
      apiId: number;
      state: unknown;
      events: unknown[];
      modelContext?: unknown;
    }>;
  };
};

export type HostConnectedPayload = {
  type: "host-connected";
};

export type FrameToHostPayload = SubscriptionPayload | ClearEventsPayload;

export type HostToFramePayload = UpdatePayload | HostConnectedPayload;
