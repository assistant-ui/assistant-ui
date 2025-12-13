import type { ThreadMessage } from "@assistant-ui/react-native";

export type OpenAITitleConfig = {
  apiKey: string;
  model?: string;
  baseURL?: string;
  /**
   * Custom fetch implementation (e.g., expo/fetch)
   */
  fetch?: typeof globalThis.fetch;
};

/**
 * Create an OpenAI-powered title generation function
 *
 * Example usage:
 * ```typescript
 * import { fetch as expoFetch } from "expo/fetch";
 *
 * const generateTitle = createOpenAITitleGenerator({
 *   apiKey: process.env.EXPO_PUBLIC_OPENAI_API_KEY,
 *   fetch: expoFetch,
 * });
 * ```
 */
export function createOpenAITitleGenerator(
  config: OpenAITitleConfig,
): (messages: readonly ThreadMessage[]) => Promise<string> {
  const {
    apiKey,
    model = "gpt-4o-mini",
    baseURL = "https://api.openai.com/v1",
    fetch: customFetch = globalThis.fetch,
  } = config;

  return async (messages: readonly ThreadMessage[]): Promise<string> => {
    try {
      const conversationText = messages
        .slice(0, 4)
        .map((m) => {
          const text = m.content
            .filter((c) => c.type === "text")
            .map((c) => ("text" in c ? c.text : ""))
            .join(" ");
          return `${m.role}: ${text}`;
        })
        .join("\n");

      const response = await customFetch(`${baseURL}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },
        body: JSON.stringify({
          model,
          messages: [
            {
              role: "system",
              content:
                "Generate a very short title (3-6 words) for this conversation. Return only the title, no quotes or punctuation.",
            },
            {
              role: "user",
              content: conversationText,
            },
          ],
          max_tokens: 20,
        }),
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      const title = data.choices?.[0]?.message?.content?.trim();

      if (title && title.length > 0) {
        return title.slice(0, 50);
      }
    } catch (error) {
      console.error("Failed to generate title:", error);
    }

    // Fallback: extract from first user message
    const firstUserMessage = messages.find((m) => m.role === "user");
    if (firstUserMessage) {
      const textContent = firstUserMessage.content.find(
        (c) => c.type === "text",
      );
      if (textContent && "text" in textContent) {
        const text = textContent.text.trim();
        return text.slice(0, 50) + (text.length > 50 ? "..." : "");
      }
    }
    return "New Chat";
  };
}
