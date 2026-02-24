import type {
  ChatModelAdapter,
  ChatModelRunResult,
} from "@assistant-ui/react-native";

export type OpenAIModelConfig = {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /** Custom fetch implementation — pass `fetch` from `expo/fetch` for streaming support */
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
        .map((m) => {
          const textParts = m.content.filter((p) => p.type === "text");
          const text = textParts
            .map((p) => ("text" in p ? p.text : ""))
            .join("\n");

          // Check for image attachments on user messages
          const imageAttachments =
            m.role === "user"
              ? (m.attachments ?? []).flatMap((a) =>
                  (a.content ?? []).filter((c: any) => c.type === "image"),
                )
              : [];

          // If user message has images, use multi-content format for vision
          if (imageAttachments.length > 0) {
            const content: any[] = [];
            if (text) {
              content.push({ type: "text", text });
            }
            for (const img of imageAttachments) {
              content.push({
                type: "image_url",
                image_url: { url: (img as any).image },
              });
            }
            return { role: "user" as const, content };
          }

          return {
            role: m.role as "user" | "assistant",
            content: text,
          };
        });

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
        const body = await response.text().catch(() => "");
        throw new Error(`OpenAI API error: ${response.status} ${body}`);
      }

      const reader = response.body?.getReader();

      // Fallback: non-streaming (if fetch impl lacks ReadableStream)
      if (!reader) {
        const json = await response.json();
        const text = json.choices?.[0]?.message?.content ?? "";
        yield {
          content: [{ type: "text" as const, text }],
        } satisfies ChatModelRunResult;
        return;
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
