// @vitest-environment jsdom

import { act, render, waitFor } from "@testing-library/react";
import { AssistantRuntimeProvider } from "@assistant-ui/core/react";
import type { AssistantCloud } from "assistant-cloud";
import type { ChatTransport, UIMessage } from "ai";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createControlledTransport,
  createStreamHarness,
} from "./__tests__/controlled-transport";
import { useChatRuntime } from "./useChatRuntime";

const lease = {
  lease_id: "lease_1",
  expires_in_ms: 90_000,
  heartbeat_interval_ms: 20_000,
};

type CreateBody = {
  parent_id: string | null;
  format: string;
  content: Record<string, unknown>;
  external_id?: string;
  open_run?: true;
};

const makeCloud = () => {
  let created = 0;
  const create = vi.fn(async (_threadId: string, body: CreateBody) => ({
    message_id: `msg_${++created}`,
    ...(body.open_run ? { run: lease } : undefined),
  }));
  const cloud = {
    threads: {
      list: vi.fn().mockResolvedValue({ threads: [] }),
      create: vi.fn(async () => ({ thread_id: "remote-1" })),
      update: vi.fn().mockResolvedValue(undefined),
      delete: vi.fn().mockResolvedValue(undefined),
      get: vi.fn(),
      messages: {
        list: vi.fn().mockResolvedValue({ messages: [] }),
        create,
        update: vi.fn().mockResolvedValue(undefined),
        delete: vi.fn().mockResolvedValue(undefined),
      },
      runs: {
        heartbeat: vi.fn().mockResolvedValue({
          expires_in_ms: 90_000,
          heartbeat_interval_ms: 20_000,
        }),
        end: vi.fn().mockResolvedValue(undefined),
      },
    },
    events: { track: vi.fn() },
    telemetry: { enabled: false },
    runs: { report: vi.fn().mockResolvedValue(undefined) },
    registerSdk: vi.fn(),
  } as unknown as AssistantCloud;
  return {
    cloud,
    messages: vi.mocked(cloud.threads.messages),
    threadRuns: vi.mocked(cloud.threads.runs),
  };
};

const CloudApp = ({
  cloud,
  transport,
  probe,
}: {
  cloud: AssistantCloud;
  transport: ChatTransport<UIMessage>;
  probe: React.ReactNode;
}) => {
  const runtime = useChatRuntime({ cloud, transport });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {probe}
    </AssistantRuntimeProvider>
  );
};

afterEach(() => {
  vi.restoreAllMocks();
});

describe("useChatRuntime with Assistant Cloud run leases", () => {
  it("stores the streaming reply in ai-sdk/v6 with a lease and ends it with the runtime's settled write", async () => {
    const { cloud, messages, threadRuns } = makeCloud();
    const { transport, emit, close } = createControlledTransport();
    const harness = createStreamHarness();
    render(
      <CloudApp
        cloud={cloud}
        transport={transport}
        probe={<harness.Probe />}
      />,
    );
    await waitFor(() =>
      expect(harness.client().threadListItem.source).toBeTruthy(),
    );

    await act(async () => harness.send());
    await waitFor(() => expect(harness.isRunning()).toBe(true));
    await act(async () => {
      emit(
        { type: "start", messageId: "reply-1" },
        { type: "text-start", id: "t1" },
        { type: "text-delta", id: "t1", delta: "partial" },
      );
    });

    await waitFor(() =>
      expect(messages.create.mock.calls.some(([, body]) => body.open_run)).toBe(
        true,
      ),
    );
    const bodies = messages.create.mock.calls.map(([, body]) => body);
    const prompt = bodies.find((body) => !body.open_run)!;
    const running = bodies.find((body) => body.open_run)!;
    expect(prompt.format).toBe("ai-sdk/v6");
    expect(running).toMatchObject({
      format: "ai-sdk/v6",
      parent_id: "msg_1",
      external_id: "reply-1",
      content: { role: "assistant" },
    });

    await act(async () => {
      emit(
        { type: "text-delta", id: "t1", delta: " answer" },
        { type: "text-end", id: "t1" },
        { type: "finish" },
      );
      close();
    });
    await waitFor(() => expect(harness.isRunning()).toBe(false));

    await waitFor(() =>
      expect(threadRuns.end).toHaveBeenCalledWith("remote-1", "lease_1", {
        reason: "done",
      }),
    );
    expect(messages.update).toHaveBeenCalledWith(
      "remote-1",
      "msg_2",
      expect.objectContaining({ lease_id: "lease_1" }),
    );
    const final = messages.update.mock.calls.at(-1)![2] as {
      content: { parts: { type: string; text?: string }[] };
    };
    expect(
      final.content.parts.some((part) => part.text === "partial answer"),
    ).toBe(true);
    expect(messages.create).toHaveBeenCalledTimes(2);
  });
});
