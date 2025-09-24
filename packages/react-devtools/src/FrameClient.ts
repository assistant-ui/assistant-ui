interface ApiData {
  apiId: number;
  state: any;
  events: any[];
  context?: any;
}

interface UpdateMessage {
  type: "update";
  data: {
    apiList?: Array<{ apiId: number }>;
    apis?: ApiData[];
  };
}

interface HostConnectedMessage {
  type: "host-connected";
}

type UpdateListener = (data: {
  apiList?: Array<{ apiId: number }>;
  apis?: ApiData[];
}) => void;

export class FrameClient {
  private listeners = new Set<UpdateListener>();
  private connectionListeners = new Set<() => void>();
  private lastUpdate: {
    apiList?: Array<{ apiId: number }>;
    apis?: ApiData[];
  } = {};

  constructor() {
    this.setupMessageListener();
  }

  private setupMessageListener() {
    window.addEventListener("message", (event) => {
      const message = event.data as UpdateMessage | HostConnectedMessage;

      if (message.type === "update") {
        this.lastUpdate = message.data;
        this.notifyListeners(message.data);
      } else if (message.type === "host-connected") {
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
        type: "subscription",
        data: options,
      },
      "*",
    );
  }

  clearEvents(apiId: number) {
    window.parent.postMessage(
      {
        type: "clearEvents",
        data: { apiId },
      },
      "*",
    );
  }

  private notifyListeners(data: UpdateMessage["data"]) {
    this.listeners.forEach((listener) => listener(data));
  }

  getLastUpdate() {
    return this.lastUpdate;
  }
}
