import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { Text } from "ink";

const mockUseAuiState = vi.fn();

type UseAuiStateSelector = Parameters<
  typeof import("@assistant-ui/store")["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

import { StatusBarPrimitiveRoot } from "../primitives/statusBar/StatusBarRoot";
import { StatusBarPrimitiveModelName } from "../primitives/statusBar/StatusBarModelName";
import { StatusBarPrimitiveMessageCount } from "../primitives/statusBar/StatusBarMessageCount";
import { StatusBarPrimitiveTokenCount } from "../primitives/statusBar/StatusBarTokenCount";
import { StatusBarPrimitiveLatency } from "../primitives/statusBar/StatusBarLatency";
import { StatusBarPrimitiveStatus } from "../primitives/statusBar/StatusBarStatus";

const setThreadState = (thread: unknown) => {
  mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
    selector({ thread } as never),
  );
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("StatusBarPrimitive.Root", () => {
  it("renders children", () => {
    const { lastFrame } = render(
      <StatusBarPrimitiveRoot>
        <Text>inner</Text>
      </StatusBarPrimitiveRoot>,
    );
    expect(lastFrame()).toContain("inner");
  });
});

describe("StatusBarPrimitive.ModelName", () => {
  it("renders the provided name", () => {
    const { lastFrame } = render(<StatusBarPrimitiveModelName name="gpt-5" />);
    expect(lastFrame()).toContain("gpt-5");
  });

  it("falls back to 'unknown'", () => {
    const { lastFrame } = render(<StatusBarPrimitiveModelName />);
    expect(lastFrame()).toContain("unknown");
  });
});

describe("StatusBarPrimitive.MessageCount", () => {
  it("renders the formatted message count", () => {
    setThreadState({ messages: [{}, {}, {}] });
    const { lastFrame } = render(<StatusBarPrimitiveMessageCount />);
    expect(lastFrame()).toContain("3 msgs");
  });

  it("renders nothing when no messages", () => {
    setThreadState({ messages: [] });
    const { lastFrame } = render(<StatusBarPrimitiveMessageCount />);
    expect(lastFrame()).toBe("");
  });

  it("applies a custom format", () => {
    setThreadState({ messages: [{}, {}] });
    const { lastFrame } = render(
      <StatusBarPrimitiveMessageCount format={(n) => `count=${n}`} />,
    );
    expect(lastFrame()).toContain("count=2");
  });
});

describe("StatusBarPrimitive.TokenCount", () => {
  it("sums tokenCount across assistant messages", () => {
    setThreadState({
      messages: [
        { role: "user" },
        { role: "assistant", metadata: { timing: { tokenCount: 120 } } },
        { role: "assistant", metadata: { timing: { tokenCount: 80 } } },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveTokenCount />);
    expect(lastFrame()).toContain("200 tokens");
  });

  it("ignores non-assistant messages", () => {
    setThreadState({
      messages: [
        { role: "user", metadata: { timing: { tokenCount: 999 } } },
        { role: "assistant", metadata: { timing: { tokenCount: 50 } } },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveTokenCount />);
    expect(lastFrame()).toContain("50 tokens");
  });

  it("renders nothing when total is zero", () => {
    setThreadState({ messages: [{ role: "user" }] });
    const { lastFrame } = render(<StatusBarPrimitiveTokenCount />);
    expect(lastFrame()).toBe("");
  });
});

describe("StatusBarPrimitive.Latency", () => {
  it("renders tokens/sec from the last assistant message", () => {
    setThreadState({
      messages: [
        {
          role: "assistant",
          metadata: { timing: { tokensPerSecond: 12.3 } },
        },
        { role: "user" },
        {
          role: "assistant",
          metadata: { timing: { tokensPerSecond: 42.7 } },
        },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveLatency />);
    expect(lastFrame()).toContain("43 tok/s");
  });

  it("renders nothing when timing is missing", () => {
    setThreadState({
      messages: [{ role: "assistant", metadata: {} }],
    });
    const { lastFrame } = render(<StatusBarPrimitiveLatency />);
    expect(lastFrame()).toBe("");
  });

  it("applies a custom format", () => {
    setThreadState({
      messages: [
        { role: "assistant", metadata: { timing: { tokensPerSecond: 50 } } },
      ],
    });
    const { lastFrame } = render(
      <StatusBarPrimitiveLatency format={(tps) => `tps=${tps.toFixed(1)}`} />,
    );
    expect(lastFrame()).toContain("tps=50.0");
  });
});

describe("StatusBarPrimitive.Status", () => {
  it("reports 'running' when the thread is running", () => {
    setThreadState({ isRunning: true, messages: [] });
    const { lastFrame } = render(<StatusBarPrimitiveStatus />);
    expect(lastFrame()).toContain("running");
  });

  it("reports 'error' when the last assistant message errored", () => {
    setThreadState({
      isRunning: false,
      messages: [
        {
          role: "assistant",
          status: { type: "incomplete", reason: "error" },
        },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveStatus />);
    expect(lastFrame()).toContain("error");
  });

  it("reports 'error' even when a user message follows an errored assistant", () => {
    setThreadState({
      isRunning: false,
      messages: [
        {
          role: "assistant",
          status: { type: "incomplete", reason: "error" },
        },
        { role: "user" },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveStatus />);
    expect(lastFrame()).toContain("error");
  });

  it("reports 'cancelled' when the last assistant message was cancelled", () => {
    setThreadState({
      isRunning: false,
      messages: [
        {
          role: "assistant",
          status: { type: "incomplete", reason: "cancelled" },
        },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveStatus />);
    expect(lastFrame()).toContain("cancelled");
  });

  it("reports 'idle' otherwise", () => {
    setThreadState({
      isRunning: false,
      messages: [
        { role: "assistant", status: { type: "complete", reason: "stop" } },
      ],
    });
    const { lastFrame } = render(<StatusBarPrimitiveStatus />);
    expect(lastFrame()).toContain("idle");
  });

  it("applies a custom format", () => {
    setThreadState({ isRunning: true, messages: [] });
    const { lastFrame } = render(
      <StatusBarPrimitiveStatus format={(s) => s.toUpperCase()} />,
    );
    expect(lastFrame()).toContain("RUNNING");
  });
});
