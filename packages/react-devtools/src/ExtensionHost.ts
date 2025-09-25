import { DevToolsHost } from "./DevToolsHost";

export class ExtensionHost {
  private devToolsHost: DevToolsHost;
  private messageListener: (event: MessageEvent) => void;

  constructor() {
    // Create DevToolsHost with callback to send messages through extension
    this.devToolsHost = new DevToolsHost((message) => {
      console.log("[ExtensionHost] Sending message to iframe:", message);
      window.postMessage(
        {
          source: "assistant-ui-devtools-page",
          payload: message,
        },
        "*",
      );
    });

    // Setup listener to forward messages from extension to DevToolsHost
    this.messageListener = (event: MessageEvent) => {
      if (event.source !== window) return;

      // Log ALL messages to see what's coming through
      if (event.data.source === "assistant-ui-devtools-iframe") {
        console.log("[ExtensionHost] Received message from iframe:", {
          source: event.data.source,
          payload: event.data.payload,
          fullData: event.data,
        });
        this.devToolsHost.onReceiveMessage(event.data.payload);
      }
    };

    window.addEventListener("message", this.messageListener);

    // Announce that a new host has connected
    // This tells the iframe to re-send its subscription
    setTimeout(() => {
      console.log("[ExtensionHost] Announcing connection to iframe");
      window.postMessage(
        {
          source: "assistant-ui-devtools-page",
          payload: {
            type: "host-connected",
          },
        },
        "*",
      );
    }, 100);
  }

  destroy() {
    window.removeEventListener("message", this.messageListener);
    this.devToolsHost.destroy();
  }
}
