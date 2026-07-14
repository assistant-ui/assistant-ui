import { contextBridge, ipcRenderer } from "electron";
import {
  ASSISTANT_STREAM_CHANNEL,
  type AssistantAI,
  type ChatEvent,
} from "./shared";

const assistantAI: AssistantAI = {
  streamChat(request, onEvent) {
    const { port1, port2 } = new MessageChannel();
    const onMessage = (event: MessageEvent<ChatEvent>) => onEvent(event.data);

    port1.addEventListener("message", onMessage);
    port1.start();
    ipcRenderer.postMessage(ASSISTANT_STREAM_CHANNEL, request, [port2]);

    let stopped = false;
    return () => {
      if (stopped) return;
      stopped = true;
      port1.removeEventListener("message", onMessage);
      port1.close();
    };
  },
};

contextBridge.exposeInMainWorld("assistantAI", assistantAI);
