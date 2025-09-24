import { DevToolsHooks } from "@assistant-ui/react";
import {
  sanitizeForMessage,
  serializeModelContext,
} from "./utils/serialization";

interface FrameToHostMessage {
  type: "subscription" | "clearEvents";
  data: {
    apiList?: boolean;
    apis?: number[];
    apiId?: number;
  };
}

interface HostToFrameMessage {
  type: "update";
  data: {
    apiList?: Array<{ apiId: number }>;
    apis?: Array<{
      apiId: number;
      state: any;
      events: any[];
      modelContext?: any;
    }>;
  };
}

export class DevToolsHost {
  private subscription: {
    apiList: boolean;
    apis: Set<number>;
  } = {
    apiList: false,
    apis: new Set(),
  };
  private unsubscribe?: () => void;
  private onSendMessage: (message: HostToFrameMessage) => void;

  constructor(onSendMessage: (message: HostToFrameMessage) => void) {
    this.onSendMessage = onSendMessage;
    this.subscribeToDevTools();
  }

  onReceiveMessage(message: FrameToHostMessage) {
    switch (message.type) {
      case "subscription":
        this.handleSubscription(message.data);
        break;
      case "clearEvents":
        if (typeof message.data.apiId === "number") {
          DevToolsHooks.clearEventLogs(message.data.apiId);
          // The subscription will automatically trigger an update
        }
        break;
    }
  }

  private handleSubscription(data: FrameToHostMessage["data"]) {
    const prevApiList = this.subscription.apiList;
    const prevApis = new Set(this.subscription.apis);

    this.subscription.apiList = data.apiList || false;
    this.subscription.apis = new Set(data.apis);

    // Only send update if subscription actually changed
    const apisChanged =
      prevApis.size !== this.subscription.apis.size ||
      [...this.subscription.apis].some((id) => !prevApis.has(id));

    if (prevApiList !== this.subscription.apiList || apisChanged) {
      this.sendUpdate();
    }
  }

  private subscribeToDevTools() {
    this.unsubscribe = DevToolsHooks.subscribe(() => {
      this.sendUpdate();
    });
  }

  private sendUpdate() {
    const update: HostToFrameMessage = {
      type: "update",
      data: {},
    };

    const allApis = DevToolsHooks.getApis();
    for (const subscriptionApiId of this.subscription.apis) {
      if (!allApis.has(subscriptionApiId)) {
        this.subscription.apis.delete(subscriptionApiId);
      }
    }

    if (this.subscription.apiList) {
      update.data.apiList = [...allApis.keys()].map((apiId) => ({ apiId }));

      if (this.subscription.apis.size === 0 && allApis.size > 0) {
        this.subscription.apis = new Set([allApis.keys().next().value!]);
      }
    }

    if (this.subscription.apis.size > 0) {
      update.data.apis = [];

      for (const apiId of this.subscription.apis) {
        const apiEntry = allApis.get(apiId);
        if (apiEntry) {
          // Collect state from api scopes (only root source)
          const state: Record<string, unknown> = {};
          if (apiEntry.api) {
            for (const [name, scope] of Object.entries(apiEntry.api)) {
              if (typeof scope === "function" && "source" in scope) {
                // Only forward scopes with source === "root"
                if (scope.source === "root") {
                  const scopeValue = scope();
                  state[name] = scopeValue?.getState?.() ?? scopeValue;
                }
              }
            }
          }

          // Extract model context from thread runtime
          const modelContext = serializeModelContext(
            apiEntry.api?.thread?.().getModelContext(),
          );

          update.data.apis.push({
            apiId,
            state: sanitizeForMessage(state),
            events: sanitizeForMessage(apiEntry.logs) as unknown[],
            modelContext: modelContext,
          });
        }
      }
    }

    if (Object.keys(update.data).length === 0) {
      return;
    }

    this.onSendMessage(update);
  }

  destroy() {
    if (this.unsubscribe) {
      this.unsubscribe();
    }
  }
}
