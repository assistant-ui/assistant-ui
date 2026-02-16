import type {
  ChatModelAdapter,
  ChatModelRunResult,
} from "@assistant-ui/react-native";

export type OpenAIModelConfig = {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /** Custom fetch implementation (e.g., expo/fetch for streaming support) */
  fetch?: typeof globalThis.fetch;
};

export function createOpenAIChatModelAdapter(
  config: OpenAIModelConfig,
): ChatModelAdapter {
  const {
    apiKey,
    model = "gpt-4o-mini",
    baseURL = "https://api.openai.com/v1",
    fetch: customFetch = globalThis.fetch,
  } = config;

  return {
    async *run({ messages, abortSignal }) {
      const openAIMessages = messages
        .filter((m) => m.role !== "system")
        .map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content
            .filter((p) => p.type === "text")
            .map((p) => ("text" in p ? p.text : ""))
            .join("\n"),
        }));

      const response = await customFetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: openAIMessages,
          stream: true,
        }),
        signal: abortSignal,
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let fullText = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const data = line.slice(6);
            if (data === "[DONE]") continue;

            try {
              const parsed = JSON.parse(data);
              const content = parsed.choices?.[0]?.delta?.content ?? "";
              fullText += content;

              yield {
                content: [{ type: "text" as const, text: fullText }],
              } satisfies ChatModelRunResult;
            } catch {
              // Skip invalid JSON
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    },
  };
}
