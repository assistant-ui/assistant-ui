import { act, type ReactElement } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessageContent } from "./MessageContent";

type AnyPart = { type: string; [key: string]: unknown };

const h = vi.hoisted(() => ({
  addToolResult: vi.fn(),
  resumeToolCall: vi.fn(),
  respondToToolApproval: vi.fn(),
  state: {
    message: { content: [] as AnyPart[] },
    tools: { tools: {} as Record<string, unknown> },
    dataRenderers: { renderers: {} as Record<string, unknown> },
  },
}));

vi.mock("@assistant-ui/store", () => {
  const aui = {
    message: () => ({
      part: ({ index }: { index: number }) => ({
        addToolResult: (...args: unknown[]) => h.addToolResult(index, ...args),
        resumeToolCall: (...args: unknown[]) =>
          h.resumeToolCall(index, ...args),
        respondToToolApproval: (...args: unknown[]) =>
          h.respondToToolApproval(index, ...args),
      }),
    }),
  };
  return {
    useAui: () => aui,
    useAuiState: <T,>(selector: (s: typeof h.state) => T) => selector(h.state),
  };
});

(globalThis as Record<string, unknown>).IS_REACT_ACT_ENVIRONMENT = true;

describe("MessageContent", () => {
  let container: HTMLDivElement;
  let root: Root;

  beforeEach(() => {
    h.addToolResult.mockReset();
    h.resumeToolCall.mockReset();
    h.respondToToolApproval.mockReset();
    h.state.message.content = [];
    h.state.tools.tools = {};
    h.state.dataRenderers.renderers = {};

    container = document.createElement("div");
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(async () => {
    await act(async () => {
      root.unmount();
    });
    container.remove();
  });

  const mount = async (
    props: Partial<Parameters<typeof MessageContent>[0]> = {},
  ) => {
    await act(async () => {
      root.render(<MessageContent {...props} />);
    });
  };

  it("renders a text part through the default text renderer", async () => {
    h.state.message.content = [{ type: "text", text: "hello world" }];
    await mount();
    expect(container.textContent).toContain("hello world");
  });

  it("prefers a provided renderText over the default renderer", async () => {
    h.state.message.content = [{ type: "text", text: "raw" }];
    const renderText = vi.fn(
      ({ part, index }): ReactElement => (
        <span data-testid={`text-${index}`}>custom:{part.text}</span>
      ),
    );
    await mount({ renderText });

    expect(renderText).toHaveBeenCalledTimes(1);
    expect(renderText).toHaveBeenCalledWith({
      part: { type: "text", text: "raw" },
      index: 0,
    });
    const el = container.querySelector('[data-testid="text-0"]');
    expect(el?.textContent).toBe("custom:raw");
    expect(container.innerHTML).not.toContain(">raw<");
  });

  it("renders nothing for an unknown part type", async () => {
    h.state.message.content = [{ type: "mystery" }];
    await mount();
    expect(container.textContent).toBe("");
  });

  it("renders null for optional parts when no renderer is provided", async () => {
    h.state.message.content = [
      { type: "image", image: "x" },
      { type: "reasoning", text: "r" },
      { type: "source", sourceType: "url", id: "1", url: "u" },
      { type: "file", filename: "f" },
    ];
    await mount();
    expect(container.textContent).toBe("");
  });

  it("renders optional parts via their provided renderers", async () => {
    h.state.message.content = [
      { type: "image", image: "x" },
      { type: "reasoning", text: "r" },
      { type: "source", sourceType: "url", id: "1", url: "u" },
      { type: "file", filename: "f" },
    ];
    const renderImage = vi.fn(
      ({ index }): ReactElement => <span>image-{index}</span>,
    );
    const renderReasoning = vi.fn(
      ({ index }): ReactElement => <span>reasoning-{index}</span>,
    );
    const renderSource = vi.fn(
      ({ index }): ReactElement => <span>source-{index}</span>,
    );
    const renderFile = vi.fn(
      ({ index }): ReactElement => <span>file-{index}</span>,
    );
    await mount({ renderImage, renderReasoning, renderSource, renderFile });

    expect(container.textContent).toBe("image-0reasoning-1source-2file-3");
    expect(renderImage).toHaveBeenCalledWith({
      part: h.state.message.content[0],
      index: 0,
    });
    expect(renderFile).toHaveBeenCalledWith({
      part: h.state.message.content[3],
      index: 3,
    });
  });

  describe("tool-call parts", () => {
    it("renders a registered tool renderer with part methods wired in", async () => {
      h.state.message.content = [
        { type: "tool-call", toolName: "search", toolCallId: "c1" },
      ];
      const ToolRender = vi.fn((props: Record<string, unknown>) => {
        (props.addResult as () => void)();
        (props.resume as () => void)();
        (props.respondToApproval as () => void)();
        return <span data-testid="tool">tool:{String(props.toolName)}</span>;
      });
      h.state.tools.tools = { search: ToolRender };

      await mount();

      const el = container.querySelector('[data-testid="tool"]');
      expect(el?.textContent).toBe("tool:search");
      expect(h.addToolResult).toHaveBeenCalledWith(0);
      expect(h.resumeToolCall).toHaveBeenCalledWith(0);
      expect(h.respondToToolApproval).toHaveBeenCalledWith(0);
    });

    it("picks the first renderer when the registry holds an array", async () => {
      h.state.message.content = [
        { type: "tool-call", toolName: "search", toolCallId: "c1" },
      ];
      const First = vi.fn(() => <span data-testid="first">first</span>);
      const Second = vi.fn(() => <span>second</span>);
      h.state.tools.tools = { search: [First, Second] };

      await mount();

      expect(container.querySelector('[data-testid="first"]')).not.toBeNull();
      expect(First).toHaveBeenCalledTimes(1);
      expect(Second).not.toHaveBeenCalled();
    });

    it("falls back to renderToolCall when no renderer is registered", async () => {
      h.state.message.content = [
        { type: "tool-call", toolName: "search", toolCallId: "c1" },
      ];
      const renderToolCall = vi.fn(
        ({ part, index }): ReactElement => (
          <span data-testid="fallback">
            fallback:{String(part.toolName)}:{index}
          </span>
        ),
      );
      await mount({ renderToolCall });

      const el = container.querySelector('[data-testid="fallback"]');
      expect(el?.textContent).toBe("fallback:search:0");
      expect(renderToolCall.mock.calls[0]![0]).toEqual({
        part: h.state.message.content[0],
        index: 0,
      });
    });

    it("renders null when no renderer is registered and no fallback is given", async () => {
      h.state.message.content = [
        { type: "tool-call", toolName: "search", toolCallId: "c1" },
      ];
      await mount();
      expect(container.textContent).toBe("");
    });
  });

  describe("data parts", () => {
    it("renders a registered data renderer", async () => {
      h.state.message.content = [
        { type: "data", name: "chart", data: { a: 1 } },
      ];
      const DataRender = vi.fn((props: Record<string, unknown>) => (
        <span data-testid="data">data:{String(props.name)}</span>
      ));
      h.state.dataRenderers.renderers = { chart: DataRender };

      await mount();

      const el = container.querySelector('[data-testid="data"]');
      expect(el?.textContent).toBe("data:chart");
    });

    it("picks the first data renderer when the registry holds an array", async () => {
      h.state.message.content = [{ type: "data", name: "chart", data: {} }];
      const First = vi.fn(() => <span data-testid="dfirst">first</span>);
      const Second = vi.fn(() => <span>second</span>);
      h.state.dataRenderers.renderers = { chart: [First, Second] };

      await mount();

      expect(container.querySelector('[data-testid="dfirst"]')).not.toBeNull();
      expect(Second).not.toHaveBeenCalled();
    });

    it("falls back to renderData when no renderer is registered", async () => {
      h.state.message.content = [{ type: "data", name: "chart", data: {} }];
      const renderData = vi.fn(
        ({ part, index }): ReactElement => (
          <span data-testid="dfallback">
            fallback:{String(part.name)}:{index}
          </span>
        ),
      );
      await mount({ renderData });

      const el = container.querySelector('[data-testid="dfallback"]');
      expect(el?.textContent).toBe("fallback:chart:0");
    });

    it("renders null when no data renderer is registered and no fallback is given", async () => {
      h.state.message.content = [{ type: "data", name: "chart", data: {} }];
      await mount();
      expect(container.textContent).toBe("");
    });
  });

  it("dispatches a mixed content array in order", async () => {
    h.state.message.content = [
      { type: "text", text: "A" },
      { type: "tool-call", toolName: "t", toolCallId: "c" },
      { type: "data", name: "d", data: {} },
    ];
    h.state.tools.tools = {
      t: () => <span>[tool]</span>,
    };
    h.state.dataRenderers.renderers = {
      d: () => <span>[data]</span>,
    };
    await mount();

    expect(container.textContent).toBe("A[tool][data]");
  });
});
