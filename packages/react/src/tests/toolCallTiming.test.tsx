// @vitest-environment jsdom

import { act, render, screen } from "@testing-library/react";
import type { FC, PropsWithChildren } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AssistantRuntimeProvider } from "../context";
import * as MessagePrimitive from "../primitives/message";
import * as ThreadPrimitive from "../primitives/thread";
import { useLocalRuntime } from "../legacy-runtime/runtime-cores/local/useLocalRuntime";
import type { ChatModelAdapter, ThreadMessageLike } from "../index";
import {
  useToolCallElapsed,
  unstable_useMessageStallDetection,
} from "../index";

const noOpAdapter: ChatModelAdapter = {
  async *run() {},
};

const toolMessage = (timing?: {
  startedAt: number;
  completedAt?: number;
}): ThreadMessageLike => ({
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "tc-1",
      toolName: "search",
      args: {},
      argsText: "{}",
      ...(timing !== undefined && { timing }),
    },
  ],
  status: { type: "running" },
});

const ElapsedProbe: FC = () => {
  const elapsedMs = useToolCallElapsed();
  return (
    <span data-testid="elapsed">
      {elapsedMs === undefined ? "none" : String(elapsedMs)}
    </span>
  );
};

const StallProbe: FC = () => {
  const { stalled } = unstable_useMessageStallDetection({ thresholdMs: 2000 });
  return <span data-testid="stalled">{String(stalled)}</span>;
};

const RuntimeProvider: FC<
  PropsWithChildren<{ messages: ThreadMessageLike[] }>
> = ({ messages, children }) => {
  const runtime = useLocalRuntime(noOpAdapter, { initialMessages: messages });
  return (
    <AssistantRuntimeProvider runtime={runtime}>
      {children}
    </AssistantRuntimeProvider>
  );
};

const renderHarness = async (messages: ThreadMessageLike[], probe: FC) => {
  render(<Harness messages={messages} probe={probe} />);
  // Flush the runtime's deferred initialization, which fake timers hold back.
  await act(async () => {
    await vi.advanceTimersByTimeAsync(0);
  });
};

const Harness: FC<{ messages: ThreadMessageLike[]; probe: FC }> = ({
  messages,
  probe: Probe,
}) => (
  <RuntimeProvider messages={messages}>
    <ThreadPrimitive.Messages
      components={{
        Message: () => (
          <MessagePrimitive.Parts components={{ tools: { Fallback: Probe } }} />
        ),
      }}
    />
  </RuntimeProvider>
);

describe("useToolCallElapsed", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("returns undefined when the part carries no timing", async () => {
    await renderHarness([toolMessage()], ElapsedProbe);
    expect(screen.getByTestId("elapsed").textContent).toBe("none");
  });

  it("returns the settled duration for completed calls", async () => {
    const startedAt = Date.now() - 5000;
    await renderHarness(
      [toolMessage({ startedAt, completedAt: startedAt + 1500 })],
      ElapsedProbe,
    );
    expect(screen.getByTestId("elapsed").textContent).toBe("1500");
  });

  it("ticks while the call is running", async () => {
    const startedAt = Date.now() - 1000;
    await renderHarness([toolMessage({ startedAt })], ElapsedProbe);

    expect(screen.getByTestId("elapsed").textContent).toBe("1000");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByTestId("elapsed").textContent).toBe("4000");
  });
});

describe("useToolCallElapsed on terminated calls", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:10.000Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("stops ticking when the call ends without a result (cancelled run)", async () => {
    const startedAt = Date.now() - 1000;
    const cancelled: ThreadMessageLike = {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
          args: {},
          argsText: "{}",
          timing: { startedAt },
        },
      ],
      status: { type: "incomplete", reason: "cancelled" },
    };
    await renderHarness([cancelled], ElapsedProbe);

    expect(screen.getByTestId("elapsed").textContent).toBe("1000");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(3000);
    });

    expect(screen.getByTestId("elapsed").textContent).toBe("1000");
  });
});

describe("useToolCallElapsed outside any scope", () => {
  it("returns undefined without a provider instead of throwing", () => {
    const Standalone: FC = () => {
      const elapsedMs = useToolCallElapsed();
      return (
        <span data-testid="standalone">
          {elapsedMs === undefined ? "none" : String(elapsedMs)}
        </span>
      );
    };
    render(<Standalone />);
    expect(screen.getByTestId("standalone").textContent).toBe("none");
  });
});

describe("unstable_useMessageStallDetection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("reports a stall after the threshold with no content changes", async () => {
    await renderHarness([toolMessage({ startedAt: 0 })], StallProbe);

    expect(screen.getByTestId("stalled").textContent).toBe("false");

    await act(async () => {
      await vi.advanceTimersByTimeAsync(2500);
    });

    expect(screen.getByTestId("stalled").textContent).toBe("true");
  });

  it("never stalls on settled messages", async () => {
    const settled: ThreadMessageLike = {
      role: "assistant",
      content: [
        {
          type: "tool-call",
          toolCallId: "tc-1",
          toolName: "search",
          args: {},
          argsText: "{}",
          result: "done",
        },
      ],
      status: { type: "complete", reason: "stop" },
    };
    await renderHarness([settled], StallProbe);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(5000);
    });

    expect(screen.getByTestId("stalled").textContent).toBe("false");
  });
});
