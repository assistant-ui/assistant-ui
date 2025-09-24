import { DevToolsHost } from "./DevToolsHost";

export class FrameHost {
  private frame: HTMLIFrameElement;
  private devToolsHost: DevToolsHost;
  private messageListener: (event: MessageEvent) => void;

  constructor(frame: HTMLIFrameElement) {
    this.frame = frame;

    // Create DevToolsHost with callback to send messages to iframe
    this.devToolsHost = new DevToolsHost((message) => {
      if (this.frame.contentWindow) {
        this.frame.contentWindow.postMessage(message, "*");
      }
    });

    // Setup listener to forward messages from iframe to DevToolsHost
    this.messageListener = (event: MessageEvent) => {
      if (event.source !== this.frame.contentWindow) return;
      this.devToolsHost.onReceiveMessage(event.data);
    };

    window.addEventListener("message", this.messageListener);
  }

  destroy() {
    window.removeEventListener("message", this.messageListener);
    this.devToolsHost.destroy();
  }
}
