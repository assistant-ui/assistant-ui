import type { ThreadMessage } from "@assistant-ui/core";

export type TitleGenerationAdapter = {
  generateTitle(messages: readonly ThreadMessage[]): Promise<string>;
};

export const createSimpleTitleAdapter = (): TitleGenerationAdapter => {
  return {
    async generateTitle(messages) {
      const firstUserMessage = messages.find((m) => m.role === "user");
      if (!firstUserMessage) return "New Thread";

      const textPart = firstUserMessage.content.find((p) => p.type === "text");
      if (!textPart || textPart.type !== "text") return "New Thread";

      const text = textPart.text.trim();
      return text.length > 50 ? `${text.slice(0, 47)}...` : text;
    },
  };
};
