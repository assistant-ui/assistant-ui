import { describe, expect, it } from "vitest";
import type { ModelContextProvider } from "../../model-context/types";
import { completeExternalMessageConversion } from "../../runtime/utils/external-message-conversion";
import { ExportedMessageRepository } from "../../runtime/utils/message-repository";
import type { ThreadMessage } from "../../types/message";
import { isErrorMessageId } from "../../utils/id";
import type { ExternalStoreAdapter } from "./external-store-adapter";
import { ExternalStoreThreadRuntimeCore } from "./external-store-thread-runtime-core";

const contextProvider: ModelContextProvider = {
  getModelContext: () => ({}),
};

const [u1, a1, u2, a2] = ExportedMessageRepository.fromArray([
  { id: "u1", role: "user", content: "first" },
  { id: "a1", role: "assistant", content: "first reply" },
  { id: "u2", role: "user", content: "second" },
  { id: "a2", role: "assistant", content: "second reply" },
]).messages.map(({ message }) => message) as [
  ThreadMessage,
  ThreadMessage,
  ThreadMessage,
  ThreadMessage,
];

const adapter = (
  messages: readonly ThreadMessage[],
  options: { error?: string; isRunning?: boolean } = {},
) =>
  ({
    messages: completeExternalMessageConversion([...messages], options.error),
    isRunning: options.isRunning ?? false,
    onNew: async () => {},
    onReload: async () => {},
  }) as ExternalStoreAdapter;

const errorIds = (runtime: ExternalStoreThreadRuntimeCore) =>
  runtime
    .export()
    .messages.map(({ message }) => message.id)
    .filter(isErrorMessageId);

describe("external-store synthesized error messages", () => {
  it("shows the error on a synthesized assistant message", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );

    const tail = runtime.messages.at(-1)!;
    expect(isErrorMessageId(tail.id)).toBe(true);
    expect(tail.status).toMatchObject({ type: "incomplete", reason: "error" });
  });

  it("drops the error message once a reload answers", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );

    runtime.__internal_setAdapter(adapter([u1], { isRunning: true }));
    expect(errorIds(runtime)).toEqual([]);
    expect(runtime.getBranches(runtime.messages.at(-1)!.id)).toHaveLength(1);

    runtime.__internal_setAdapter(adapter([u1, a1]));
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "a1"]);
    expect(runtime.getBranches("a1")).toEqual(["a1"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("drops the error message once a new message is sent", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );

    runtime.__internal_setAdapter(adapter([u1, u2], { isRunning: true }));
    expect(runtime.getBranches("u2")).toEqual(["u2"]);

    runtime.__internal_setAdapter(adapter([u1, u2, a2]));
    expect(runtime.messages.map((m) => m.id)).toEqual(["u1", "u2", "a2"]);
    expect(runtime.getBranches("u2")).toEqual(["u2"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("drops an error that follows earlier turns once the reply arrives", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1, a1, u2], { error: "502" }),
    );

    runtime.__internal_setAdapter(adapter([u1, a1, u2, a2]));
    expect(runtime.getBranches("a2")).toEqual(["a2"]);
    expect(errorIds(runtime)).toEqual([]);
  });

  it("keeps only the latest error message when the error is converted again", () => {
    const runtime = new ExternalStoreThreadRuntimeCore(
      contextProvider,
      adapter([u1], { error: "502" }),
    );
    const first = runtime.messages.at(-1)!.id;

    runtime.__internal_setAdapter(adapter([u1], { error: "503" }));
    const second = runtime.messages.at(-1)!.id;

    expect(second).not.toBe(first);
    expect(runtime.getBranches(second)).toEqual([second]);
    expect(errorIds(runtime)).toEqual([second]);
  });

  it("keeps the error message while the snapshot still carries it", () => {
    const messages = adapter([u1], { error: "502" }).messages!;
    const runtime = new ExternalStoreThreadRuntimeCore(contextProvider, {
      messages,
      onNew: async () => {},
    } as ExternalStoreAdapter);
    const errorId = runtime.messages.at(-1)!.id;

    runtime.__internal_setAdapter({
      messages,
      isRunning: false,
      onNew: async () => {},
      suggestions: [],
    } as ExternalStoreAdapter);

    expect(runtime.messages.at(-1)!.id).toBe(errorId);
    expect(errorIds(runtime)).toEqual([errorId]);
  });
});
