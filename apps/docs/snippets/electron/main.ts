import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import { ipcMain, type BrowserWindow, type IpcMainEvent } from "electron";
import {
  ASSISTANT_STREAM_CHANNEL,
  type ChatEvent,
  type ChatRequest,
} from "./shared";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const isChatRequest = (value: unknown): value is ChatRequest => {
  if (!isRecord(value) || !Array.isArray(value.messages)) return false;
  if (value.system !== undefined && typeof value.system !== "string") {
    return false;
  }
  if (value.messages.length > 200) return false;

  let totalLength = typeof value.system === "string" ? value.system.length : 0;
  for (const message of value.messages) {
    if (!isRecord(message)) return false;
    if (message.role !== "user" && message.role !== "assistant") return false;
    if (typeof message.content !== "string") return false;
    totalLength += message.content.length;
    if (totalLength > 1_000_000) return false;
  }

  return true;
};

export function registerAssistantIpc(mainWindow: BrowserWindow) {
  const handleStream = (event: IpcMainEvent, request: unknown) => {
    const [port] = event.ports;
    if (!port) return;

    if (
      event.sender !== mainWindow.webContents ||
      event.senderFrame !== mainWindow.webContents.mainFrame
    ) {
      port.close();
      return;
    }

    port.start();
    if (!isChatRequest(request)) {
      port.postMessage({
        type: "error",
        message: "Invalid chat request.",
      } satisfies ChatEvent);
      return;
    }

    const abortController = new AbortController();
    port.once("close", () => abortController.abort());
    const send = (message: ChatEvent) => port.postMessage(message);

    void (async () => {
      try {
        const result = streamText({
          model: openai("gpt-5.4-mini"),
          messages: request.messages,
          ...(request.system ? { instructions: request.system } : {}),
          abortSignal: abortController.signal,
        });

        for await (const text of result.textStream) {
          send({ type: "delta", text });
        }
        send({ type: "done" });
      } catch (error) {
        if (abortController.signal.aborted) return;
        console.error("Assistant stream failed", error);
        send({ type: "error", message: "The model request failed." });
      }
    })();
  };

  ipcMain.on(ASSISTANT_STREAM_CHANNEL, handleStream);
  mainWindow.once("closed", () => {
    ipcMain.removeListener(ASSISTANT_STREAM_CHANNEL, handleStream);
  });
}
