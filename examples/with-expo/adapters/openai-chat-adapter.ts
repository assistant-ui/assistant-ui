import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ThreadMessage,
} from "@assistant-ui/react-native";

export type OpenAIModelConfig = {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /**
   * Custom fetch implementation (e.g., expo/fetch for streaming support)
   */
  fetch?: typeof globalThis.fetch;
};

/**
 * Create an OpenAI-compatible chat model adapter
 *
 * Example usage:
 * ```typescript
 * import { fetch as expoFetch } from "expo/fetch";
 *
 * const adapter = createOpenAIChatModelAdapter({
 *   apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
 *   model: "gpt-4o-mini",
 *   fetch: expoFetch,
 * });
 * ```
 */
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
    run: async ({ messages, abortSignal, onUpdate }: ChatModelRunOptions) => {
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
      const createdAt = new Date();

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") continue;

              try {
                const parsed = JSON.parse(data);
                const content = parsed.choices?.[0]?.delta?.content ?? "";
                fullText += content;

                onUpdate({
                  id: "",
                  role: "assistant",
                  content: [{ type: "text", text: fullText }],
                  createdAt,
                  status: { type: "running" },
                  metadata: {
                    unstable_state: null,
                    unstable_annotations: [],
                    unstable_data: [],
                    steps: [],
                    custom: {},
                  },
                });
              } catch {
                // Skip invalid JSON
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }

      return {
        id: "",
        role: "assistant",
        content: [{ type: "text", text: fullText }],
        createdAt,
        status: { type: "complete", reason: "stop" },
        metadata: {
          unstable_state: null,
          unstable_annotations: [],
          unstable_data: [],
          steps: [],
          custom: {},
        },
      } as ThreadMessage;
    },
  };
}
