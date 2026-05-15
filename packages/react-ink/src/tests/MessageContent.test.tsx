import type { ReactElement } from "react";
import { Text } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "ink-testing-library";
import { MessageContent } from "../primitives/message/MessageContent";
import {
  mockMessageState,
  partContext,
  renderFrame,
  resetPartContext,
  type UseAuiStateSelector,
} from "./helpers";

const mockUseAui = vi.fn();
const mockUseAuiState = vi.fn();

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAui: () => mockUseAui(),
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

vi.mock("@assistant-ui/core/react", async (importOriginal) => {
  const actual =
    await importOriginal<typeof import("@assistant-ui/core/react")>();
  return {
    ...actual,
    PartByIndexProvider: ({
      index,
      children,
    }: {
      index: number;
      children: ReactElement;
    }) => {
      partContext.index = index;
      return children;
    },
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  resetPartContext();
});

describe("MessageContent", () => {
  it("renders incomplete tool calls as errors instead of running forever", async () => {
    mockMessageState(mockUseAuiState, {
      tools: { tools: {} },
      message: {
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
    });
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

  it("renders terminal-safe default fallbacks for non-tool parts", async () => {
    mockMessageState(mockUseAuiState, {
      tools: { tools: {} },
      dataRenderers: { renderers: {}, fallbacks: [] },
      message: {
        parts: [
          {
            type: "image",
            image: "data:image/png;base64,raw-image-bytes",
            filename: "chart.png",
            status: { type: "complete" },
          },
          {
            type: "file",
            filename: "report.txt",
            mimeType: "text/plain",
            data: "raw file contents",
            status: { type: "complete" },
          },
          {
            type: "source",
            sourceType: "url",
            id: "src-1",
            title: "Docs",
            url: "https://example.com/docs",
            status: { type: "complete" },
          },
          {
            type: "reasoning",
            text: "thinking text",
            status: { type: "complete" },
          },
          {
            type: "data",
            name: "weather",
            data: { temperature: 72 },
            status: { type: "complete" },
          },
        ],
      },
    });

    const frame = await renderFrame(<MessageContent />);

    expect(frame).toContain("[image: chart.png]");
    expect(frame).toContain("[file: report.txt text/plain]");
    expect(frame).toContain("[source: Docs https://example.com/docs]");
    expect(frame).toContain("thinking text");
    expect(frame).toContain("[data: weather]");
    expect(frame).not.toContain("raw-image-bytes");
    expect(frame).not.toContain("raw file contents");
  });

  it("lets renderReasoning suppress the intentional reasoning default", async () => {
    mockMessageState(mockUseAuiState, {
      tools: { tools: {} },
      dataRenderers: { renderers: {}, fallbacks: [] },
      message: {
        parts: [
          {
            type: "reasoning",
            text: "thinking text",
            status: { type: "complete" },
          },
        ],
      },
    });

    const frame = await renderFrame(
      <MessageContent renderReasoning={() => <></>} />,
    );

    expect(frame).toBe("");
  });

  it("uses custom render props instead of default fallbacks", async () => {
    mockMessageState(mockUseAuiState, {
      tools: { tools: {} },
      dataRenderers: { renderers: {}, fallbacks: [] },
      message: {
        parts: [
          {
            type: "image",
            image: "image-data",
            status: { type: "complete" },
          },
          {
            type: "file",
            mimeType: "text/plain",
            data: "file-data",
            status: { type: "complete" },
          },
          {
            type: "source",
            sourceType: "url",
            id: "src-1",
            url: "https://example.com",
            status: { type: "complete" },
          },
          {
            type: "reasoning",
            text: "thinking text",
            status: { type: "complete" },
          },
          {
            type: "data",
            name: "weather",
            data: {},
            status: { type: "complete" },
          },
        ],
      },
    });

    const frame = await renderFrame(
      <MessageContent
        renderImage={() => <Text>custom image</Text>}
        renderFile={() => <Text>custom file</Text>}
        renderSource={() => <Text>custom source</Text>}
        renderReasoning={() => <Text>custom reasoning</Text>}
        renderData={() => <Text>custom data</Text>}
      />,
    );

    expect(frame).toContain("custom image");
    expect(frame).toContain("custom file");
    expect(frame).toContain("custom source");
    expect(frame).toContain("custom reasoning");
    expect(frame).toContain("custom data");
    expect(frame).not.toContain("[image:");
    expect(frame).not.toContain("[file:");
    expect(frame).not.toContain("[source:");
    expect(frame).not.toContain("[data:");
    expect(frame).not.toContain("thinking text");
  });

  it("uses registered tool UI before renderToolCall", async () => {
    const ToolUI = () => <Text>registered tool</Text>;
    mockMessageState(mockUseAuiState, {
      tools: { tools: { search: ToolUI } },
      dataRenderers: { renderers: {}, fallbacks: [] },
      message: {
        parts: [
          {
            type: "tool-call",
            toolCallId: "tool-call-1",
            toolName: "search",
            args: {},
            argsText: "{}",
            status: { type: "complete" },
          },
        ],
      },
    });
    mockUseAui.mockReturnValue({
      message: () => ({
        part: () => ({
          addToolResult: vi.fn(),
          resumeToolCall: vi.fn(),
        }),
      }),
    });

    const frame = await renderFrame(
      <MessageContent renderToolCall={() => <Text>render prop tool</Text>} />,
    );

    expect(frame).toBe("registered tool");
  });

  it("uses registered named data renderer before renderData", async () => {
    const DataUI = () => <Text>registered data</Text>;
    mockMessageState(mockUseAuiState, {
      tools: { tools: {} },
      dataRenderers: { renderers: { weather: DataUI }, fallbacks: [] },
      message: {
        parts: [
          {
            type: "data",
            name: "weather",
            data: {},
            status: { type: "complete" },
          },
        ],
      },
    });

    const frame = await renderFrame(
      <MessageContent renderData={() => <Text>render prop data</Text>} />,
    );

    expect(frame).toBe("registered data");
  });

  it("uses dataRenderers.fallbacks[0] before renderData when no named renderer matches", async () => {
    const DataFallback = () => <Text>fallback data</Text>;
    mockMessageState(mockUseAuiState, {
      tools: { tools: {} },
      dataRenderers: { renderers: {}, fallbacks: [DataFallback] },
      message: {
        parts: [
          {
            type: "data",
            name: "weather",
            data: {},
            status: { type: "complete" },
          },
        ],
      },
    });

    const frame = await renderFrame(
      <MessageContent renderData={() => <Text>render prop data</Text>} />,
    );

    expect(frame).toBe("fallback data");
  });
});
