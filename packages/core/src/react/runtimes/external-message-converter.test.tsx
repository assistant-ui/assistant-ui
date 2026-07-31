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

const EMPTY: TestMetadata = {};

type Props = {
  callback?: useExternalMessageConverter.Callback<TestMessage>;
  metadata?: TestMetadata;
};

const renderConverter = (initialProps: Props = {}) =>
  renderHook(
    ({ callback = convert, metadata = EMPTY }: Props) =>
      useExternalMessageConverter<TestMessage>({
        callback,
        messages: MESSAGES,
        isRunning: false,
        metadata,
      }),
    { initialProps },
  );

describe("useExternalMessageConverter", () => {
  it("reuses converted messages across rerenders when inputs are unchanged", () => {
    const { result, rerender } = renderConverter();

    const first = result.current;
    rerender({});

    expect(result.current[0]).toBe(first[0]);
    expect(result.current[1]).toBe(first[1]);
  });

  it("re-converts cached messages when metadata changes", () => {
    const { result, rerender } = renderConverter({
      metadata: { optimisticMessageId: "a1" },
    });

    expect(result.current.at(-1)?.metadata.isOptimistic).toBe(true);

    rerender({ metadata: {} });

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

    const { result, rerender } = renderConverter();

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

  it.each([
    ["false", false],
    ["zero", 0],
    ["an empty string", ""],
  ])("preserves %s assistant state", (_label, state) => {
    const callback: useExternalMessageConverter.Callback<TestMessage> = (
      message,
    ) => ({
      role: message.role,
      id: message.id,
      content: [{ type: "text", text: message.text }],
      ...(message.role === "assistant"
        ? { metadata: { unstable_state: state } }
        : undefined),
    });

    const { result } = renderConverter({ callback });

    expect(result.current[1]?.metadata.unstable_state).toBe(state);
  });
});
