import { renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useExternalMessageConverter } from "./external-message-converter";

type TestMessage = {
  id: string;
  role: "user" | "assistant";
  text: string;
};

type TestMetadata = useExternalMessageConverter.Metadata & {
  optimisticMessageId?: string;
};

const messages: TestMessage[] = [
  { id: "u1", role: "user", text: "hi" },
  { id: "a1", role: "assistant", text: "hello" },
];

const convert: useExternalMessageConverter.Callback<TestMessage> = (
  message,
  metadata,
) => ({
  role: message.role,
  id: message.id,
  content: [{ type: "text", text: message.text }],
  metadata: {
    ...(message.role === "assistant" &&
      message.id === (metadata as TestMetadata).optimisticMessageId && {
        isOptimistic: true,
      }),
  },
});

describe("compiled useExternalMessageConverter", () => {
  it("re-converts cached messages when metadata changes", () => {
    const initialProps: { metadata: TestMetadata } = {
      metadata: { optimisticMessageId: "a1" },
    };
    const { result, rerender } = renderHook(
      ({ metadata }: { metadata: TestMetadata }) =>
        useExternalMessageConverter<TestMessage>({
          callback: convert,
          messages,
          isRunning: false,
          metadata,
        }),
      {
        initialProps,
      },
    );

    expect(result.current.at(-1)?.metadata.isOptimistic).toBe(true);

    rerender({ metadata: {} });

    expect(result.current.at(-1)?.metadata.isOptimistic).toBeUndefined();
  });
});
