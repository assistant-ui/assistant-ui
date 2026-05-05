import { Text } from "ink";
import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup } from "ink-testing-library";
import { MessagePartPrimitive } from "../index";
import { mockPart, renderFrame, type UseAuiStateSelector } from "./helpers";

const mockUseAuiState = vi.fn();

vi.mock("@assistant-ui/store", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@assistant-ui/store")>();
  return {
    ...actual,
    useAuiState: (selector: UseAuiStateSelector) => mockUseAuiState(selector),
  };
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("MessagePartPrimitive", () => {
  it("renders the current text part", async () => {
    mockPart(mockUseAuiState, {
      type: "text",
      text: "hello terminal",
      status: { type: "complete" },
    });

    const frame = await renderFrame(<MessagePartPrimitive.Text />);

    expect(frame).toBe("hello terminal");
  });

  it("renders in-progress children only for running parts", async () => {
    mockPart(mockUseAuiState, {
      type: "text",
      text: "",
      status: { type: "running" },
    });

    const running = await renderFrame(
      <MessagePartPrimitive.InProgress>
        <Text>running</Text>
      </MessagePartPrimitive.InProgress>,
    );

    mockPart(mockUseAuiState, {
      type: "text",
      text: "",
      status: { type: "complete" },
    });

    const complete = await renderFrame(
      <MessagePartPrimitive.InProgress>
        <Text>running</Text>
      </MessagePartPrimitive.InProgress>,
    );

    expect(running).toBe("running");
    expect(complete).toBe("");
  });

  it("renders image metadata without raw image data", async () => {
    mockPart(mockUseAuiState, {
      type: "image",
      image: "data:image/png;base64,raw-image-bytes",
      filename: "chart.png",
      status: { type: "complete" },
    });

    const frame = await renderFrame(<MessagePartPrimitive.Image />);

    expect(frame).toContain("[image: chart.png]");
    expect(frame).not.toContain("raw-image-bytes");
  });

  it("renders file metadata without file data", async () => {
    mockPart(mockUseAuiState, {
      type: "file",
      filename: "report.txt",
      mimeType: "text/plain",
      data: "raw file contents",
      status: { type: "complete" },
    });

    const frame = await renderFrame(<MessagePartPrimitive.File />);

    expect(frame).toContain("[file: report.txt text/plain]");
    expect(frame).not.toContain("raw file contents");
  });

  it("renders source title and URL metadata", async () => {
    mockPart(mockUseAuiState, {
      type: "source",
      sourceType: "url",
      id: "src-1",
      title: "Docs",
      url: "https://example.com/docs",
      status: { type: "complete" },
    });

    const frame = await renderFrame(<MessagePartPrimitive.Source />);

    expect(frame).toBe("[source: Docs https://example.com/docs]");
  });

  it("renders reasoning text conservatively", async () => {
    mockPart(mockUseAuiState, {
      type: "reasoning",
      text: "thinking text",
      status: { type: "complete" },
    });

    const frame = await renderFrame(<MessagePartPrimitive.Reasoning />);

    expect(frame).toBe("thinking text");
  });

  it("renders data metadata", async () => {
    mockPart(mockUseAuiState, {
      type: "data",
      name: "weather",
      data: { temperature: 72 },
      status: { type: "complete" },
    });

    const frame = await renderFrame(<MessagePartPrimitive.Data />);

    expect(frame).toBe("[data: weather]");
  });
});
