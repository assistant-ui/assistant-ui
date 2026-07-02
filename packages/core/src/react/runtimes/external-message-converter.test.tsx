// @vitest-environment jsdom

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

const MESSAGES: TestMessage[] = [
  { id: "u1", role: "user", text: "hi" },
  { id: "a1", role: "assistant", text: "hello" },
];

describe("useExternalMessageConverter", () => {
  it("reuses converted messages across rerenders when inputs are unchanged", () => {
    const metadata: TestMetadata = {};
    const { result, rerender } = renderHook(() =>
      useExternalMessageConverter<TestMessage>({
        callback: convert,
        messages: MESSAGES,
        isRunning: false,
        metadata,
      }),
    );

    const first = result.current;
    rerender();

    expect(result.current[0]).toBe(first[0]);
    expect(result.current[1]).toBe(first[1]);
  });

  it("re-converts cached messages when metadata changes", () => {
    const { result, rerender } = renderHook(
      ({
        isRunning,
        metadata,
      }: {
        isRunning: boolean;
        metadata: TestMetadata;
      }) =>
        useExternalMessageConverter<TestMessage>({
          callback: convert,
          messages: MESSAGES,
          isRunning,
          metadata,
        }),
      {
        initialProps: {
          isRunning: true,
          metadata: { optimisticMessageId: "a1" } as TestMetadata,
        },
      },
    );

    expect(result.current.at(-1)?.metadata.isOptimistic).toBe(true);

    rerender({ isRunning: false, metadata: {} });

    expect(result.current.at(-1)?.metadata.isOptimistic).toBeUndefined();
  });

  it("re-converts cached messages when the callback changes", () => {
    const upper: useExternalMessageConverter.Callback<TestMessage> = (
      message,
    ) => ({
      role: message.role,
      id: message.id,
      content: [{ type: "text", text: message.text.toUpperCase() }],
    });

    const metadata: TestMetadata = {};
    const { result, rerender } = renderHook(
      ({
        callback,
      }: {
        callback: useExternalMessageConverter.Callback<TestMessage>;
      }) =>
        useExternalMessageConverter<TestMessage>({
          callback,
          messages: MESSAGES,
          isRunning: false,
          metadata,
        }),
      { initialProps: { callback: convert } },
    );

    expect(result.current[1]?.content[0]).toMatchObject({
      type: "text",
      text: "hello",
    });

    rerender({ callback: upper });

    expect(result.current[1]?.content[0]).toMatchObject({
      type: "text",
      text: "HELLO",
    });
  });
});
