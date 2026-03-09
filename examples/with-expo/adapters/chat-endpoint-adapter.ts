import type { ChatModelAdapter } from "@assistant-ui/react-native";

export type ChatEndpointConfig = {
  endpoint: string;
  /** Custom fetch implementation — pass `fetch` from `expo/fetch` for streaming support */
  fetch?: typeof globalThis.fetch;
};

export function createChatEndpointAdapter(
  config: ChatEndpointConfig,
): ChatModelAdapter {
  const { endpoint, fetch: customFetch = globalThis.fetch } = config;

  return {
    async *run({ messages, abortSignal }) {
      // Convert to simple message format for the endpoint
      const apiMessages = messages
        .filter((m) => m.role !== "system")
        .flatMap((m) => {
          if (m.role === "user") {
            const text = m.content
              .filter((p) => p.type === "text")
              .map((p) => ("text" in p ? p.text : ""))
              .join("\n");
            return [{ role: "user" as const, content: text }];
          }
          if (m.role === "assistant") {
            const parts: any[] = [];
            const textParts = m.content.filter((p) => p.type === "text");
            const toolCallParts = m.content.filter(
              (p) => p.type === "tool-call",
            );

            if (textParts.length > 0) {
              parts.push({
                type: "text",
                text: textParts
                  .map((p) => ("text" in p ? p.text : ""))
                  .join("\n"),
              });
            }

            for (const tc of toolCallParts) {
              parts.push({
                type: "tool-invocation",
                toolInvocation: {
                  toolCallId: (tc as any).toolCallId,
                  toolName: (tc as any).toolName,
                  args: (tc as any).args,
                  state: (tc as any).result !== undefined ? "result" : "call",
                  ...((tc as any).result !== undefined && {
                    result: (tc as any).result,
                  }),
                },
              });
            }

            return [
              {
                role: "assistant" as const,
                content: textParts
                  .map((p) => ("text" in p ? p.text : ""))
                  .join("\n"),
                parts,
              },
            ];
          }
          return [];
        });

      const response = await customFetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages }),
        signal: abortSignal,
      });

      if (!response.ok) {
        const body = await response.text().catch(() => "");
        throw new Error(`Chat endpoint error: ${response.status} ${body}`);
      }

      const reader = response.body?.getReader();
      if (!reader) return;

      const decoder = new TextDecoder();
      let fullText = "";
      const toolCalls: Record<
        string,
        { toolCallId: string; toolName: string; argsText: string }
      > = {};

      try {
        let buffer = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          // Keep incomplete last line in buffer
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data:")) continue;
            const data = line.slice(5).trim();
            if (data === "[DONE]") continue;

            try {
              const event = JSON.parse(data);
              switch (event.type) {
                case "text-delta":
                  fullText += event.textDelta;
                  yield { content: buildContent(fullText, toolCalls) };
                  break;

                case "tool-call-start":
                  toolCalls[event.toolCallId] = {
                    toolCallId: event.toolCallId,
                    toolName: event.toolName,
                    argsText: "",
                  };
                  yield { content: buildContent(fullText, toolCalls) };
                  break;

                case "tool-call-delta": {
                  const tc = toolCalls[event.toolCallId];
                  if (tc) tc.argsText += event.argsText;
                  yield { content: buildContent(fullText, toolCalls) };
                  break;
                }

                case "tool-result": {
                  const tc = toolCalls[event.toolCallId];
                  if (tc) {
                    yield {
                      content: buildContent(fullText, toolCalls, {
                        toolCallId: event.toolCallId,
                        result: event.result,
                      }),
                    };
                  }
                  break;
                }
              }
            } catch {
              // skip invalid JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}

function buildContent(
  text: string,
  toolCalls: Record<
    string,
    { toolCallId: string; toolName: string; argsText: string }
  >,
  toolResult?: { toolCallId: string; result: any },
) {
  const content: any[] = [];
  if (text) content.push({ type: "text" as const, text });

  for (const tc of Object.values(toolCalls)) {
    let args = {};
    try {
      args = JSON.parse(tc.argsText);
    } catch {
      // still streaming
    }
    content.push({
      type: "tool-call" as const,
      toolCallId: tc.toolCallId,
      toolName: tc.toolName,
      args,
      ...(toolResult?.toolCallId === tc.toolCallId && {
        result: toolResult.result,
      }),
    });
  }

  return content;
}
