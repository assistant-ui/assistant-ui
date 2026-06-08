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

import { reactArtifact, type ReactArtifactArgs } from "./reactArtifact";

type Result = { ok: boolean; error?: string };

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
  overrides: Partial<ToolCallMessagePartProps<ReactArtifactArgs, Result>>,
): ToolCallMessagePartProps<ReactArtifactArgs, Result> {
  return {
    type: "tool-call",
    toolCallId: "tool-1",
    toolName: "create_react_artifact",
    argsText: "",
    args: { code: "" },
    status: { type: "complete" },
    result: undefined,
    addResult: vi.fn(),
    resume: vi.fn(),
    respondToApproval: vi.fn(),
    ...overrides,
  } as unknown as ToolCallMessagePartProps<ReactArtifactArgs, Result>;
}

describe("reactArtifact", () => {
  it("is a standalone human tool with no execute", () => {
    const tool = reactArtifact();
    expect(tool.type).toBe("human");
    expect(tool.execute).toBeUndefined();
    expect(tool.parameters).toBeDefined();
    expect(typeof tool.render).toBe("function");
  });

  describe("render", () => {
    let container: HTMLDivElement;
    let root: Root;
    let rendered: ReturnType<typeof fakeRendered>;

    beforeEach(() => {
      container = document.createElement("div");
      document.body.appendChild(container);
      root = createRoot(container);
      rendered = fakeRendered();
      renderHtmlMock.mockReset();
      renderHtmlMock.mockResolvedValue(rendered);
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

    async function mount(
      props: ToolCallMessagePartProps<ReactArtifactArgs, Result>,
    ) {
      const Render = reactArtifact().render!;
      await act(async () => {
        root.render(<Render {...props} />);
      });
      await flush();
    }

    function dispatch(data: unknown) {
      return act(async () => {
        window.dispatchEvent(
          new MessageEvent("message", {
            data,
            origin: rendered.origin,
            source: rendered.iframe.contentWindow,
          }),
        );
      });
    }

    it("compiles the source into the sandbox host", async () => {
      await mount(partProps({ args: { code: "export default () => null" } }));
      expect(renderHtmlMock).toHaveBeenCalledTimes(1);
      const html = renderHtmlMock.mock.calls[0]![0] as string;
      expect(html).toContain("export default () => null");
      expect(html).toContain("@babel/standalone");
    });

    it("reports ok via addResult when the iframe signals a clean mount", async () => {
      const addResult = vi.fn();
      await mount(
        partProps({ args: { code: "export default () => null" }, addResult }),
      );
      await dispatch({ type: "aui-artifact:status", ok: true });
      expect(addResult).toHaveBeenCalledTimes(1);
      expect(addResult).toHaveBeenCalledWith({ ok: true });
    });

    it("mounts and settles at requires-action, before the tool reaches complete", async () => {
      // Regression: a human tool sits at "requires-action" (input done, awaiting
      // the render's result) and never reaches "complete" until addResult, so
      // gating render on "complete" deadlocks. It must mount at requires-action.
      const addResult = vi.fn();
      await mount(
        partProps({
          args: { code: "export default () => null" },
          status: { type: "requires-action", reason: "interrupt" },
          addResult,
        }),
      );
      expect(renderHtmlMock).toHaveBeenCalledTimes(1);
      await dispatch({ type: "aui-artifact:status", ok: true });
      expect(addResult).toHaveBeenCalledWith({ ok: true });
    });

    it("reports the error message when the iframe signals a failed mount", async () => {
      const addResult = vi.fn();
      await mount(
        partProps({ args: { code: "export default () => null" }, addResult }),
      );
      await dispatch({
        type: "aui-artifact:status",
        ok: false,
        error: { message: "boom" },
      });
      expect(addResult).toHaveBeenCalledWith({ ok: false, error: "boom" });
    });

    it("auto-resizes from the iframe's reported height", async () => {
      await mount(partProps({ args: { code: "export default () => null" } }));
      await dispatch({ type: "aui-artifact:size", height: 321 });
      const div = container.firstElementChild as HTMLDivElement;
      expect(div.style.height).toBe("321px");
    });

    it("does not render or settle while the source is still streaming", async () => {
      const addResult = vi.fn();
      await mount(
        partProps({
          args: { code: "export def" },
          status: { type: "running" },
          addResult,
        }),
      );
      expect(renderHtmlMock).not.toHaveBeenCalled();
      expect(addResult).not.toHaveBeenCalled();
      expect(container.firstElementChild).toBeNull();
    });
  });
});
