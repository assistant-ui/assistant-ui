"use client";
import {
  CompositeAttachmentAdapter,
  SimpleImageAttachmentAdapter,
  SimpleTextAttachmentAdapter,
  AssistantRuntimeProvider,
} from "@assistant-ui/react";
import {
  type ChatModelAdapter,
  type ChatModelRunOptions,
  useLocalRuntime,
} from "@assistant-ui/react";

async function* tokenByToken(str: string) {
  for (const token of str.split(" ")) {
    await new Promise((resolve) => setTimeout(resolve, Math.random() * 10 + 5));
    yield token + " ";
  }
}

const LOREM_IPSUM = `Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat. Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in culpa qui officia deserunt mollit anim id est laborum.`;

class DummyChatAdapter implements ChatModelAdapter {
  async *run({ messages }: ChatModelRunOptions) {
    const text =
      messages.length === 1
        ? "This is a mocked chat endpoint for testing purposes. \n\n" +
          LOREM_IPSUM
        : LOREM_IPSUM;
    let output = "";

    for await (const token of tokenByToken(text)) {
      output += token;

      yield {
        content: [
          {
            type: "text" as const,
            text: output,
          },
        ],
      };
    }
  }
}

export function MyRuntimeProvider({ children }: { children: React.ReactNode }) {
  const runtime = useLocalRuntime(new DummyChatAdapter(), {
    adapters: {
      attachments: new CompositeAttachmentAdapter([
        new SimpleImageAttachmentAdapter(),
        new SimpleTextAttachmentAdapter(),
      ]),
      feedback: {
        submit: ({ message, type }) => {
          console.log({ message, type });
        },
      },
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
}
