import type { ReactElement } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "ink-testing-library";
import { MessageContent } from "./MessageContent";

const mockUseAui = vi.fn();
const mockUseAuiState = vi.fn();

type UseAuiStateSelector = Parameters<
  typeof import("@assistant-ui/store")["useAuiState"]
>[0];

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mockUseAui(),
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

const renderFrame = async (node: ReactElement) => {
  const instance = render(node);
  await new Promise((resolve) => setTimeout(resolve, 0));
  return instance.lastFrame() ?? "";
};

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MessageContent", () => {
  it("renders incomplete tool calls as errors instead of running forever", async () => {
    const state = {
      tools: { tools: {} },
      message: {
        content: [
          {
            type: "tool-call",
            toolCallId: "tool-call-1",
            toolName: "search",
            args: { query: "weather" },
            argsText: '{"query":"weather"}',
          },
        ],
        parts: [
          {
            type: "tool-call",
            toolCallId: "tool-call-1",
            toolName: "search",
            args: { query: "weather" },
            argsText: '{"query":"weather"}',
            status: {
              type: "incomplete",
              reason: "error",
              error: "request failed",
            },
          },
        ],
      },
    };

    mockUseAuiState.mockImplementation((selector: UseAuiStateSelector) =>
      selector(state as never),
    );
    mockUseAui.mockReturnValue({
      message: () => ({
        part: () => ({
          addToolResult: vi.fn(),
          resumeToolCall: vi.fn(),
        }),
      }),
    });

    const frame = await renderFrame(<MessageContent />);

    expect(frame).toContain("search");
    expect(frame).toContain("Error:");
    expect(frame).toContain("request failed");
    expect(frame).not.toContain("Running...");
  });
});
