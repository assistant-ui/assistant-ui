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
  it("refreshes positional fallback ids when an id-less message is prepended", () => {
    const idlessConvert: useExternalMessageConverter.Callback<TestMessage> = (
      message,
    ) => ({
      role: message.role,
      content: [{ type: "text", text: message.text }],
    });

    const older: TestMessage = { id: "u0", role: "user", text: "older" };
    const newer: TestMessage = { id: "u1", role: "user", text: "newer" };

    const { result, rerender } = renderHook(
      ({ messages }: { messages: TestMessage[] }) =>
        useExternalMessageConverter<TestMessage>({
          callback: idlessConvert,
          messages,
          isRunning: false,
          metadata: EMPTY,
        }),
      { initialProps: { messages: [newer] } },
    );

    rerender({ messages: [older, newer] });

    const ids = result.current.map((message) => message.id);
    expect(ids).toEqual([
      "__external_store_fallback_0",
      "__external_store_fallback_1",
    ]);
    expect(
      result.current.map((message) => (message.content[0] as any).text),
    ).toEqual(["older", "newer"]);
  });

  it("never rewrites a caller-supplied id that matches the generated shape", () => {
    const explicitConvert: useExternalMessageConverter.Callback<TestMessage> = (
      message,
    ) => ({
      role: message.role,
      id: message.id === "explicit" ? "__external_store_fallback_0" : undefined,
      content: [{ type: "text", text: message.text }],
    });

    const explicit: TestMessage = {
      id: "explicit",
      role: "user",
      text: "kept",
    };
    const older: TestMessage = { id: "u0", role: "user", text: "older" };

    const { result, rerender } = renderHook(
      ({ messages }: { messages: TestMessage[] }) =>
        useExternalMessageConverter<TestMessage>({
          callback: explicitConvert,
          messages,
          isRunning: false,
          metadata: EMPTY,
        }),
      { initialProps: { messages: [explicit] } },
    );

    rerender({ messages: [older, explicit] });

    // The caller-supplied id survives untouched — at the cost of colliding
    // with the id minted for the prepended message, since the caller chose an
    // id inside the reserved fallback namespace. The full list makes that
    // trade-off explicit.
    expect(result.current.map((message) => message.id)).toEqual([
      "__external_store_fallback_0",
      "__external_store_fallback_0",
    ]);
    const explicitOut = result.current.find(
      (message) => (message.content[0] as any).text === "kept",
    );
    expect(explicitOut?.id).toBe("__external_store_fallback_0");
  });

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

  it("throws the descriptive converter error when the callback returns an invalid message", () => {
    const bad = (() =>
      undefined) as unknown as useExternalMessageConverter.Callback<TestMessage>;

    expect(() => renderConverter({ callback: bad })).toThrowError(
      /External message converter: the converter callback returned an invalid message \(undefined\) for input \{"id":"u1"/,
    );
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
