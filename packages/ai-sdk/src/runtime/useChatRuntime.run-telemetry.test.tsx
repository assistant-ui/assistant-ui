// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { ThreadHistoryAdapter, ThreadMessage } from "@assistant-ui/core";
import { flushTapSync } from "@assistant-ui/tap";
import { DefaultChatTransport, type ChatTransport, type UIMessage } from "ai";
import { describe, expect, it, vi } from "vitest";
import {
  createControlledTransport,
  createStreamHarness,
} from "./__tests__/controlled-transport";
import { useChatRuntime } from "./useChatRuntime";

const mountWithHistory = (transport: ChatTransport<UIMessage>) => {
  const reportTelemetry = vi.fn();
  const append = vi.fn(async () => {});
  const deleteItems = vi.fn(async () => {});
  const history: ThreadHistoryAdapter = {
    load: async () => ({ messages: [] }),
    append: async () => {},
    withFormat: () =>
      ({
        load: async () => ({ messages: [] }),
        append,
        delete: deleteItems,
        reportTelemetry,
      }) as never,
  };
  const harness = createStreamHarness();
  const App = () => {
    const runtime = useChatRuntime({ transport, adapters: { history } });
    return (
      <AssistantRuntimeProvider runtime={runtime}>
        <harness.Probe />
      </AssistantRuntimeProvider>
    );
  };
  render(<App />);
  const assistantReports = () =>
    reportTelemetry.mock.calls
      .map(([, options]) => options?.message as ThreadMessage | undefined)
      .filter((message) => message?.role === "assistant")
      .map((message) => message!.status);
  return { harness, assistantReports, append, deleteItems };
};

describe("useChatRuntime run telemetry", () => {
  it.each([
    ["an empty composer", undefined, 0],
    ["a follow-up already typed", "follow-up", 1],
  ])(
    "reports a run stopped before its first token with %s",
    async (_, draft, threadLength) => {
      const { harness, assistantReports, append, deleteItems } =
        mountWithHistory(createControlledTransport().transport);
      await waitFor(() => expect(harness.client()).toBeDefined());
      harness.send();
      await waitFor(() => expect(harness.isRunning()).toBe(true));
      await waitFor(() => expect(append).toHaveBeenCalledOnce());
      if (draft !== undefined)
        flushTapSync(() => harness.client().composer.setText(draft));

      await harness.client().thread.cancelRun();

      await waitFor(() =>
        expect(assistantReports()).toEqual([
          { type: "incomplete", reason: "cancelled" },
        ]),
      );
      expect(harness.client().thread.getState().messages).toHaveLength(
        threadLength,
      );
      if (draft === undefined) {
        await waitFor(() => expect(deleteItems).toHaveBeenCalledOnce());
        expect(deleteItems).toHaveBeenCalledWith([
          expect.objectContaining({
            message: expect.objectContaining({
              role: "user",
              parts: [{ type: "text", text: "keep streaming" }],
            }),
          }),
        ]);
      } else {
        expect(deleteItems).not.toHaveBeenCalled();
      }
    },
  );

  it("keeps an answered prompt stored when its reload stops before the first token", async () => {
    const stream = createControlledTransport();
    const { harness, append, deleteItems } = mountWithHistory(stream.transport);
    await waitFor(() => expect(harness.client()).toBeDefined());
    harness.send();
    await waitFor(() => expect(harness.isRunning()).toBe(true));
    stream.emit(
      { type: "start" },
      { type: "text-start", id: "t" },
      { type: "text-delta", id: "t", delta: "answer" },
      { type: "text-end", id: "t" },
      { type: "finish" },
    );
    stream.close();
    await waitFor(() => expect(harness.isRunning()).toBe(false));
    await waitFor(() => expect(append).toHaveBeenCalledTimes(2));

    harness.client().thread.message({ index: 1 }).reload();
    await waitFor(() => expect(harness.isRunning()).toBe(true));
    await harness.client().thread.cancelRun();
    await waitFor(() => expect(harness.isRunning()).toBe(false));

    expect(
      harness
        .client()
        .thread.getState()
        .messages.map((message) => message.role),
    ).toEqual(["user"]);
    expect(harness.client().composer.getState().text).toBe("");
    expect(deleteItems).not.toHaveBeenCalled();
  });

  it("reports the HTTP status of a request that failed before streaming", async () => {
    const { harness, assistantReports } = mountWithHistory(
      new DefaultChatTransport({
        api: "http://localhost/api/chat",
        fetch: async () => new Response("rate limited", { status: 429 }),
      }),
    );
    await waitFor(() => expect(harness.client()).toBeDefined());

    harness.send();

    await waitFor(() =>
      expect(assistantReports()).toEqual([
        {
          type: "incomplete",
          reason: "error",
          error: expect.objectContaining({
            message: "rate limited",
            statusCode: 429,
          }),
        },
      ]),
    );
  });

  it("reports a run that ends without output as incomplete", async () => {
    let respond!: () => void;
    const responded = new Promise<void>((resolve) => {
      respond = resolve;
    });
    const { harness, assistantReports } = mountWithHistory(
      new DefaultChatTransport({
        api: "http://localhost/api/chat",
        fetch: async () => {
          await responded;
          return new Response("", {
            status: 200,
            headers: { "content-type": "text/event-stream" },
          });
        },
      }),
    );
    await waitFor(() => expect(harness.client()).toBeDefined());
    harness.send();
    await waitFor(() => expect(harness.isRunning()).toBe(true));

    respond();

    await waitFor(() =>
      expect(assistantReports()).toEqual([
        { type: "incomplete", reason: "other" },
      ]),
    );
  });
});
