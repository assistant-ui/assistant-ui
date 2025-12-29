import type {
  ChatModelAdapter,
  ChatModelRunOptions,
  ChatModelRunResult,
} from "@assistant-ui/react";

export const localAdapter: ChatModelAdapter = {
  async *run(
    _options: ChatModelRunOptions,
  ): AsyncGenerator<ChatModelRunResult> {
    yield {
      content: [
        {
          type: "text",
          text: "Hello! This response is locally generated.",
        },
      ],
      status: {
        type: "complete",
        reason: "unknown",
      },
    };
  },
};
