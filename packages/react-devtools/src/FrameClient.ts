import {
  DEVTOOLS_PROTOCOL,
  DEVTOOLS_PROTOCOL_VERSION,
  DevToolsMessage,
  HostToFramePayload,
} from "./types";

type UpdatePayload = Extract<HostToFramePayload, { type: "update" }>["data"];

type UpdateListener = (data: UpdatePayload) => void;

export class FrameClient {
  private listeners = new Set<UpdateListener>();
  private connectionListeners = new Set<() => void>();
  private lastUpdate: UpdatePayload = {};

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener("message", (event) => {
      const message = event.data as DevToolsMessage<HostToFramePayload>;

      if (
        !message ||
        message.protocol !== DEVTOOLS_PROTOCOL ||
        message.version !== DEVTOOLS_PROTOCOL_VERSION
      ) {
        return;
      }

      const payload = message.payload;
      if (payload.type === "update") {
        this.lastUpdate = payload.data;
        this.notifyListeners(payload.data);
      } else if (payload.type === "host-connected") {
        // Host has reconnected (page refresh), notify listeners to re-subscribe
        this.connectionListeners.forEach((listener) => listener());
      }
    });
  }

  onHostConnected(listener: () => void): () => void {
    this.connectionListeners.add(listener);
    return () => {
      this.connectionListeners.delete(listener);
    };
  }

  subscribe(listener: UpdateListener): () => void {
    this.listeners.add(listener);

    // Send the last update to the new listener
    if (this.lastUpdate.apiList || this.lastUpdate.apis) {
      listener(this.lastUpdate);
    }

    return () => {
      this.listeners.delete(listener);
    };
  }

  setSubscription(options: { apiList?: boolean; apis?: number[] }) {
    window.parent.postMessage(
      {
        protocol: DEVTOOLS_PROTOCOL,
        version: DEVTOOLS_PROTOCOL_VERSION,
        payload: {
          type: "subscription",
          data: options,
        },
      },
      "*",
    );
  }

  clearEvents(apiId: number) {
    window.parent.postMessage(
      {
        protocol: DEVTOOLS_PROTOCOL,
        version: DEVTOOLS_PROTOCOL_VERSION,
        payload: {
          type: "clearEvents",
          data: { apiId },
        },
      },
      "*",
    );
  }

  private notifyListeners(data: UpdatePayload) {
    this.listeners.forEach((listener) => listener(data));
  }

  getLastUpdate() {
    return this.lastUpdate;
  }
}
