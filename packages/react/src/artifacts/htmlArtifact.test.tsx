// @vitest-environment jsdom
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolCallMessagePartProps } from "@assistant-ui/core/react";

const { renderHtmlMock } = vi.hoisted(() => ({ renderHtmlMock: vi.fn() }));

vi.mock("safe-content-frame", () => ({
  SafeContentFrame: class {
    renderHtml = renderHtmlMock;
  },
}));

import { htmlArtifact, type HtmlArtifactArgs } from "./htmlArtifact";

function fakeRendered() {
  const iframe = document.createElement("iframe");
  document.body.appendChild(iframe);
  return {
    iframe,
    origin: "https://fake.scf.test",
    sendMessage: vi.fn(),
    dispose: vi.fn(),
    fullyLoadedPromiseWithTimeout: vi.fn(),
  };
}

const flush = () =>
  act(async () => {
    await new Promise((r) => setTimeout(r, 0));
  });

function partProps(
  overrides: Partial<ToolCallMessagePartProps<HtmlArtifactArgs, never>>,
): ToolCallMessagePartProps<HtmlArtifactArgs, Record<string, never>> {
  return {
    type: "tool-call",
    toolCallId: "tool-1",
    toolName: "create_html_artifact",
    argsText: "",
    args: { html: "" },
    status: { type: "complete" },
    result: undefined,
    addResult: vi.fn(),
    resume: vi.fn(),
    respondToApproval: vi.fn(),
    ...overrides,
  } as unknown as ToolCallMessagePartProps<
    HtmlArtifactArgs,
    Record<string, never>
  >;
}

describe("htmlArtifact", () => {
  it("is a standalone frontend tool that resolves immediately", async () => {
    const tool = htmlArtifact();
    expect(tool.type).toBe("frontend");
    expect(tool.display).toBe("standalone");
    expect(tool.parameters).toBeDefined();
    expect(typeof tool.render).toBe("function");
    await expect(tool.execute?.({}, {} as never)).resolves.toEqual({});
  });

  describe("render", () => {
    let container: HTMLDivElement;
    let root: Root;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      renderHtmlMock.mockReset();
      renderHtmlMock.mockResolvedValue(fakeRendered());
    });

    afterEach(() => {
      act(() => {
        try {
          root.unmount();
        } catch {
          // ignore
        }
      });
      container.remove();
    });

    it("renders the complete html document into the sandbox host", async () => {
      const Render = htmlArtifact().render!;
      await act(async () => {
        root.render(
          <Render
            {...partProps({
              args: { title: "My Page", html: "<h1>hi</h1>" },
              status: { type: "complete" },
            })}
          />,
        );
      });
      await flush();

      expect(renderHtmlMock).toHaveBeenCalledTimes(1);
      const html = renderHtmlMock.mock.calls[0]![0] as string;
      expect(html).toContain("<h1>hi</h1>");
      expect(html).toContain("aui-artifact:size");
      expect(
        container.firstElementChild?.getAttribute("data-artifact-title"),
      ).toBe("My Page");
    });

    it("auto-resizes the frame from the iframe's reported height, clamped to maxHeight", async () => {
      const rendered = fakeRendered();
      renderHtmlMock.mockResolvedValue(rendered);
      const Render = htmlArtifact({ maxHeight: 800 }).render!;
      await act(async () => {
        root.render(
          <Render {...partProps({ args: { html: "<h1>hi</h1>" } })} />,
        );
      });
      await flush();

      const div = container.firstElementChild as HTMLDivElement;
      await act(async () => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: "aui-artifact:size", height: 333 },
            origin: rendered.origin,
            source: rendered.iframe.contentWindow,
          }),
        );
      });
      expect(div.style.height).toBe("333px");

      await act(async () => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data: { type: "aui-artifact:size", height: 5000 },
            origin: rendered.origin,
            source: rendered.iframe.contentWindow,
          }),
        );
      });
      expect(div.style.height).toBe("800px");
    });

    it("renders nothing while the args are still streaming", async () => {
      const Render = htmlArtifact().render!;
      await act(async () => {
        root.render(
          <Render
            {...partProps({
              args: { html: "<h1>par" },
              status: { type: "running" },
            })}
          />,
        );
      });
      await flush();

      expect(renderHtmlMock).not.toHaveBeenCalled();
      expect(container.firstElementChild).toBeNull();
    });
  });
});
