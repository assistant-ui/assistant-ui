import type { ChatModelAdapter, ThreadMessage } from "@assistant-ui/react";

// Converts assistant-ui messages to the request your backend expects.
const toBackendMessages = (messages: readonly ThreadMessage[]) =>
  messages
    .filter((message) => message.role !== "system")
    .map((message) => ({
      role: message.role,
      text: message.content
        .map((part) => (part.type === "text" ? part.text : ""))
        .join(""),
    }));

export const backendAdapter: ChatModelAdapter = {
  async *run({ messages, abortSignal }) {
    const res = await fetch("/api/backend/chat", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ messages: toBackendMessages(messages) }),
      signal: abortSignal,
    });
    if (!res.ok || !res.body) throw new Error(`Backend error: ${res.status}`);

    // Each yield replaces the message so far, so yield the whole text each time.
    const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
    let text = "";
    for (;;) {
      const { done, value } = await reader.read();
      if (done) return;
      text += value;
      yield { content: [{ type: "text", text }] };
    }
  },
};
