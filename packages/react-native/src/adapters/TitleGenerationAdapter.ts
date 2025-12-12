import type { ThreadMessage } from "@assistant-ui/core";

/**
 * Title generation adapter interface
 *
 * Implement this interface to customize how thread titles are generated.
 */
export type TitleGenerationAdapter = {
  generateTitle: (messages: readonly ThreadMessage[]) => Promise<string>;
};

/**
 * Create a simple title adapter that extracts from first user message
 *
 * This is the default title generation strategy.
 */
export function createSimpleTitleAdapter(): TitleGenerationAdapter {
  return {
    generateTitle: async (messages) => {
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
    },
  };
}
