// @vitest-environment jsdom

import { render, waitFor } from "@testing-library/react";
import {
  AuiConfig,
  AuiProvider,
  AssistantRuntimeProvider,
  type ChatModelAdapter,
} from "@assistant-ui/react";
import { afterAll, afterEach, describe, expect, it, vi } from "vitest";
import { useSampleRuntime } from "./use-sample-runtime";

const originalBaseUrl = vi.hoisted(() => {
  const original = process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;
  process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL = "http://assistant-cloud.test";
  return original;
});

const emptyConfig = AuiConfig({});
const chatModel: ChatModelAdapter = { async *run() {} };
const seed = [
  { role: "user" as const, content: "Seeded question" },
  { role: "assistant" as const, content: "Seeded answer" },
];

describe("useSampleRuntime", () => {
  afterEach(() => vi.restoreAllMocks());

  afterAll(() => {
    if (originalBaseUrl === undefined) {
      delete process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL;
    } else {
      process.env.NEXT_PUBLIC_ASSISTANT_BASE_URL = originalBaseUrl;
    }
  });

  it("keeps seeded sample threads in memory when automatic Cloud is configured", async () => {
    const fetchSpy = vi
      .spyOn(globalThis, "fetch")
      .mockRejectedValue(new Error("unexpected Assistant Cloud request"));
    const capture: { runtime?: ReturnType<typeof useSampleRuntime> } = {};

    function Probe() {
      const runtime = useSampleRuntime(chatModel, { initialMessages: seed });
      capture.runtime = runtime;
      return (
        <AssistantRuntimeProvider runtime={runtime}>
          <div />
        </AssistantRuntimeProvider>
      );
    }

    render(
      <AuiProvider extends={null} config={emptyConfig}>
        <Probe />
      </AuiProvider>,
    );

    await waitFor(() =>
      expect(capture.runtime?.thread.getState().messages).toHaveLength(2),
    );
    expect(
      capture.runtime?.thread.getState().messages[0]?.content[0],
    ).toMatchObject({ text: "Seeded question" });
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
