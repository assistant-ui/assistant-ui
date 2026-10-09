import { act, cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_DARK_TOKENS, DEFAULT_LIGHT_TOKENS } from "../theme";
import type { CreateWidgetOptions, WidgetHandle } from "../widget";
import { planCodeUpdate, syncWidgetCode } from "./sync";
import { Widget } from "./Widget";

const mocks = vi.hoisted(() => {
  const createFake = (options: unknown) => {
    const calls: [string, ...unknown[]][] = [];
    const handle = {
      options,
      calls,
      code: "",
      ended: false,
      write: vi.fn((chunk: string) => {
        handle.code += chunk;
        calls.push(["write", chunk]);
      }),
      end: vi.fn(async () => {
        handle.ended = true;
        calls.push(["end"]);
        return { size: { width: 0, height: 0 }, blank: false, errorCount: 0 };
      }),
      replace: vi.fn(async (code: string) => {
        handle.code = code;
        handle.ended = true;
        calls.push(["replace", code]);
        return { size: { width: 0, height: 0 }, blank: false, errorCount: 0 };
      }),
      setTheme: vi.fn(),
      dispose: vi.fn(),
    };
    return handle;
  };
  const instances: ReturnType<typeof createFake>[] = [];
  return {
    instances,
    createWidget: vi.fn((options: unknown) => {
      const handle = createFake(options);
      instances.push(handle);
      return handle;
    }),
  };
});

vi.mock("../widget", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../widget")>()),
  createWidget: mocks.createWidget,
}));

afterEach(() => {
  cleanup();
  mocks.instances.length = 0;
});

describe("planCodeUpdate", () => {
  it("appends only the new suffix of a growing string", () => {
    expect(planCodeUpdate("", "<p>")).toEqual({ type: "append", chunk: "<p>" });
    expect(planCodeUpdate("<p>", "<p>hi")).toEqual({
      type: "append",
      chunk: "hi",
    });
    expect(planCodeUpdate("<p>hi", "<p>hi")).toEqual({ type: "none" });
    expect(planCodeUpdate("<p>hi", "<div>")).toEqual({
      type: "replace",
      code: "<div>",
    });
  });
});

describe("syncWidgetCode", () => {
  const fake = () => {
    const calls: unknown[] = [];
    const widget = {
      code: "",
      ended: false,
      write(chunk: string) {
        widget.code += chunk;
        calls.push(["write", chunk]);
      },
      async end() {
        widget.ended = true;
        calls.push(["end"]);
        return { size: { width: 0, height: 0 }, blank: false, errorCount: 0 };
      },
      async replace(code: string) {
        widget.code = code;
        widget.ended = true;
        calls.push(["replace", code]);
        return { size: { width: 0, height: 0 }, blank: false, errorCount: 0 };
      },
    };
    return { widget, calls };
  };

  it("writes suffixes while streaming and ends once streaming stops", () => {
    const { widget, calls } = fake();
    syncWidgetCode(widget, "<h3>", true);
    syncWidgetCode(widget, "<h3>Hi", true);
    syncWidgetCode(widget, "<h3>Hi</h3>", false);
    syncWidgetCode(widget, "<h3>Hi</h3>", false);
    expect(calls).toEqual([
      ["write", "<h3>"],
      ["write", "Hi"],
      ["write", "</h3>"],
      ["end"],
    ]);
  });

  it("does not end an empty widget", () => {
    const { widget, calls } = fake();
    syncWidgetCode(widget, "", false);
    expect(calls).toEqual([]);
  });

  it("replaces when the code is not an extension or the widget already ended", () => {
    const { widget, calls } = fake();
    syncWidgetCode(widget, "<p>a", true);
    syncWidgetCode(widget, "<div>b", true);
    syncWidgetCode(widget, "<div>bc", false);
    expect(calls).toEqual([
      ["write", "<p>a"],
      ["replace", "<div>b"],
      ["replace", "<div>bc"],
    ]);
  });
});

describe("<Widget>", () => {
  it("mounts once and streams only new suffixes into the widget", () => {
    const view = render(<Widget code="<h3>Re" streaming />);
    expect(mocks.createWidget).toHaveBeenCalledTimes(1);
    const widget = mocks.instances[0]!;
    expect((widget.options as CreateWidgetOptions).container).toBeInstanceOf(
      HTMLDivElement,
    );

    view.rerender(<Widget code="<h3>Revenue</h3>" streaming />);
    view.rerender(<Widget code="<h3>Revenue</h3><p>1</p>" streaming />);
    view.rerender(<Widget code="<h3>Revenue</h3><p>1</p>" streaming={false} />);
    expect(widget.calls).toEqual([
      ["write", "<h3>Re"],
      ["write", "venue</h3>"],
      ["write", "<p>1</p>"],
      ["end"],
    ]);

    view.rerender(<Widget code="<h3>Sales</h3>" />);
    expect(widget.calls.at(-1)).toEqual(["replace", "<h3>Sales</h3>"]);
    expect(mocks.createWidget).toHaveBeenCalledTimes(1);
  });

  it("renders complete code with a single write and end", () => {
    render(<Widget code="<p>done</p>" />);
    expect(mocks.instances[0]!.calls).toEqual([
      ["write", "<p>done</p>"],
      ["end"],
    ]);
  });

  it("calls the latest handler and forwards theme changes", () => {
    const first = vi.fn();
    const second = vi.fn();
    const view = render(
      <Widget code="" onPrompt={first} tokens={DEFAULT_LIGHT_TOKENS} />,
    );
    const widget = mocks.instances[0]!;
    view.rerender(
      <Widget code="" onPrompt={second} tokens={DEFAULT_DARK_TOKENS} />,
    );
    act(() => {
      (widget.options as CreateWidgetOptions).onPrompt!("hello");
    });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledWith("hello");
    expect(widget.setTheme).toHaveBeenCalledWith(DEFAULT_DARK_TOKENS);
    expect((widget.options as CreateWidgetOptions).onCallTool).toBeUndefined();
  });

  it("disposes the widget on unmount", () => {
    const view = render(<Widget code="<p>x</p>" />);
    const widget = mocks.instances[0] as unknown as WidgetHandle;
    view.unmount();
    expect(widget.dispose).toHaveBeenCalledTimes(1);
  });
});
