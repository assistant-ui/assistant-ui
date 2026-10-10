import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import {
  createSpecToolkit,
  resolveSpecBase,
} from "../spec/assistant-ui/toolkit";
import { defineCatalog } from "../spec/catalog";
import type { SpecComponentProps } from "../spec/react/SpecRenderer";
import { resolveWidgetCode, resolveWidgetOrigin } from "./history";
import { createWidgetToolkit, useWidgetInstructions } from "./toolkit";

const mocks = vi.hoisted(() => ({
  append: vi.fn(),
  register: vi.fn(),
  messages: [] as unknown[],
  remoteId: undefined as string | undefined,
  argsStatus: "complete" as "complete" | "streaming",
  propStatus: {} as Record<string, string>,
  instructions: [] as unknown[],
  widgetProps: [] as Record<string, unknown>[],
  widgets: [] as FakeWidget[],
  inspection: {
    kind: "html",
    ended: true,
    size: { width: 600, height: 120 },
    blank: false,
    errors: [] as { kind: string; message: string; line?: number }[],
    console: [] as { level: string; message: string }[],
  },
  preview: vi.fn(),
}));

type FakeWidget = {
  code: string;
  ended: boolean;
  write(chunk: string): void;
  end(): Promise<unknown>;
  replace(code: string): Promise<unknown>;
  on(event: string, listener: (payload: unknown) => void): () => void;
  inspect(): Promise<unknown>;
};

const fakeWidget = (): FakeWidget => {
  const listeners = new Set<(payload: unknown) => void>();
  const finish = async () => {
    const result = { size: { width: 600, height: 120 }, blank: false };
    for (const listener of [...listeners]) listener(result);
    return result;
  };
  return {
    code: "",
    ended: false,
    write(chunk) {
      this.code += chunk;
    },
    end() {
      this.ended = true;
      return finish();
    },
    replace(code) {
      this.code = code;
      this.ended = true;
      return finish();
    },
    on(_event, listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    inspect: async () => mocks.inspection,
  };
};

vi.mock("@assistant-ui/react", () => ({
  useAui: () => ({ thread: { append: mocks.append } }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({
      thread: { messages: mocks.messages },
      threadListItem: { remoteId: mocks.remoteId },
    }),
  useToolArgsStatus: () => ({
    status: "running",
    argsStatus: mocks.argsStatus,
    propStatus: mocks.propStatus,
  }),
  useAssistantInstructions: (config: unknown) =>
    mocks.instructions.push(config),
}));

vi.mock("../react/useWidget", async (importOriginal) => {
  const { useState } = await import("react");
  return {
    ...(await importOriginal<typeof import("../react/useWidget")>()),
    useWidget: (options: Record<string, unknown>) => {
      mocks.widgetProps.push(options);
      const [widget] = useState(() => {
        const created = fakeWidget();
        mocks.widgets.push(created);
        return created;
      });
      return { ref: () => {}, widget };
    },
  };
});

vi.mock("../preview", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../preview")>()),
  previewWidget: mocks.preview,
}));

afterEach(() => {
  cleanup();
  mocks.messages = [];
  mocks.remoteId = undefined;
  mocks.argsStatus = "complete";
  mocks.propStatus = {};
  mocks.instructions.length = 0;
  mocks.widgetProps.length = 0;
  mocks.widgets.length = 0;
  mocks.inspection.errors = [];
});

const call = (
  toolCallId: string,
  toolName: string,
  args: Record<string, unknown>,
) => ({
  type: "tool-call",
  toolCallId,
  toolName,
  args,
  argsText: JSON.stringify(args),
});

const catalog = defineCatalog({
  components: {
    Text: {
      description: "Text",
      props: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
});
const components = {
  Text: ({ props }: SpecComponentProps<{ text: string }>) => (
    <p>{props.text}</p>
  ),
};

type Entry = {
  type: string;
  display?: string;
  description?: string;
  parameters?: unknown;
  execute?: (
    input: unknown,
    context?: { toolCallId: string },
  ) => Promise<unknown>;
  render: ComponentType<Record<string, unknown>>;
};
const entries = (toolkit: unknown) => toolkit as Record<string, Entry>;

const partProps = (toolCallId: string, args: Record<string, unknown>) => ({
  type: "tool-call",
  toolCallId,
  toolName: "x",
  args,
  argsText: "",
  status: { type: "complete" },
  addResult: vi.fn(),
  resume: vi.fn(),
  respondToApproval: vi.fn(),
});

describe("history", () => {
  const messages = [
    { content: "hi" },
    {
      content: [
        { type: "text", text: "ok" },
        call("a", "show_widget", { title: "w", widget_code: "<p>one</p>" }),
        call("b", "edit_widget", {
          title: "w",
          edits: [{ old_string: "one", new_string: "two" }],
        }),
        call("c", "edit_widget", {
          title: "w",
          edits: [{ old_string: "missing", new_string: "x" }],
        }),
        call("d", "edit_widget", {
          title: "w",
          edits: [{ old_string: "two", new_string: "three" }],
        }),
        call("e", "render_spec", {
          title: "s",
          patches:
            '{"op":"add","path":"/root","value":"t"}\n{"op":"add","path":"/elements/t","value":{"type":"Text","props":{"text":"a"}}}',
        }),
        call("f", "render_spec", {
          title: "s",
          patches:
            '{"op":"replace","path":"/elements/t/props/text","value":"b"}',
        }),
        call("g", "render_spec", { title: "s", patches: "" }),
      ],
    },
  ];

  it("replays shows and edits per title", () => {
    expect(resolveWidgetCode(messages, "a")).toBe("<p>one</p>");
    expect(resolveWidgetCode(messages, "b")).toBe("<p>two</p>");
    expect(resolveWidgetCode(messages, "c")).toBeUndefined();
    expect(resolveWidgetCode(messages, "d")).toBe("<p>three</p>");
    expect(resolveWidgetCode(messages, "zzz")).toBeUndefined();
  });

  it("finds the spec earlier render_spec calls built", () => {
    expect(resolveSpecBase(messages, "e", "s")).toBeUndefined();
    expect(resolveSpecBase(messages, "f", "s")?.elements["t"]?.props).toEqual({
      text: "a",
    });
    expect(resolveSpecBase(messages, "g", "s")?.elements["t"]?.props).toEqual({
      text: "b",
    });
  });
});

describe("createWidgetToolkit", () => {
  it("declares frontend tools that execute in the browser", async () => {
    const { toolkit, registry } = createWidgetToolkit({ renderReport: false });
    const tools = entries(toolkit);
    expect(Object.keys(tools)).toEqual([
      "read_me",
      "show_widget",
      "edit_widget",
      "preview_widget",
    ]);
    expect(tools["show_widget"]).toMatchObject({
      type: "frontend",
      display: "standalone",
    });
    expect(tools["read_me"]).toMatchObject({
      type: "frontend",
      display: "inline",
    });
    expect(tools["show_widget"]!.parameters).toMatchObject({
      required: ["title", "widget_code"],
    });
    await tools["show_widget"]!.execute!({
      title: "w",
      widget_code: "<p>a</p>",
    });
    expect(registry.get("w")?.code).toBe("<p>a</p>");
    expect(await tools["read_me"]!.execute!({ modules: [] })).toContain(
      "# Widgets",
    );
  });

  it("adds extra tools that execute and render nothing", async () => {
    const lookup = {
      name: "lookup",
      description: "Looks up data.",
      inputSchema: { type: "object" as const },
      execute: async () => ({ rows: 3 }),
    };
    const { toolkit, tools } = createWidgetToolkit({
      renderReport: false,
      extraTools: { lookup },
    });
    expect(tools["lookup"]).toBe(lookup);
    const entry = entries(toolkit)["lookup"]!;
    expect(entry).toMatchObject({ type: "frontend", display: "inline" });
    expect(await entry.execute!({})).toEqual({ rows: 3 });
  });

  it("renders only in backend mode and adds render_spec with spec mode", () => {
    const tools = entries(
      createWidgetToolkit({
        execution: "backend",
        spec: createSpecToolkit(catalog, { components }),
      }).toolkit,
    );
    expect(Object.keys(tools)).toEqual([
      "read_me",
      "show_widget",
      "edit_widget",
      "preview_widget",
      "render_spec",
    ]);
    expect(tools["render_spec"]).toEqual({
      type: "backend",
      display: "standalone",
      render: expect.any(Function),
    });
  });

  it("streams show_widget code and appends sendPrompt to the thread", () => {
    const { toolkit, registry } = createWidgetToolkit({
      widget: { maxHeight: 500 },
    });
    const ShowWidget = entries(toolkit)["show_widget"]!.render;
    mocks.propStatus = { widget_code: "streaming" };
    const view = render(
      <ShowWidget
        {...partProps("a", { title: "w", loading_messages: ["Drawing"] })}
      />,
    );
    expect(view.getByRole("status").textContent).toBe("Drawing");

    view.rerender(
      <ShowWidget {...partProps("a", { title: "w", widget_code: "<p>par" })} />,
    );
    const widget = mocks.widgets.at(-1)!;
    expect(widget.code).toBe("<p>par");
    expect(widget.ended).toBe(false);
    expect(mocks.widgetProps.at(-1)).toMatchObject({ maxHeight: 500 });
    expect(registry.get("w")).toBeUndefined();

    mocks.propStatus = { widget_code: "complete" };
    view.rerender(
      <ShowWidget
        {...partProps("a", { title: "w", widget_code: "<p>partial</p>" })}
      />,
    );
    expect(widget.code).toBe("<p>partial</p>");
    expect(widget.ended).toBe(true);
    expect(registry.get("w")?.code).toBe("<p>partial</p>");

    (mocks.widgetProps.at(-1)!["onPrompt"] as (text: string) => void)(
      "Tell me more",
    );
    expect(mocks.append).toHaveBeenCalledWith("Tell me more");
    expect(mocks.widgetProps.at(-1)!["tokens"]).toMatchObject({
      colorScheme: "light",
    });
  });

  it("returns the live render report from show_widget", async () => {
    vi.useFakeTimers();
    try {
      const { toolkit } = createWidgetToolkit();
      const tools = entries(toolkit);
      const ShowWidget = tools["show_widget"]!.render;
      mocks.inspection.errors = [
        { kind: "error", message: "boom is not defined", line: 3 },
      ];
      const pending = tools["show_widget"]!.execute!(
        { title: "w", widget_code: "<p>a</p>" },
        { toolCallId: "a" },
      );
      mocks.propStatus = { widget_code: "complete" };
      render(
        <ShowWidget
          {...partProps("a", { title: "w", widget_code: "<p>a</p>" })}
        />,
      );
      await act(() => vi.advanceTimersByTimeAsync(300));
      expect(await pending).toMatchObject({
        ok: true,
        title: "w",
        render: {
          status: "rendered",
          ok: false,
          height: 120,
          errors: [{ message: "boom is not defined" }],
          feedback: expect.stringContaining(
            "- error: boom is not defined (line 3)",
          ),
        },
      });

      const late = tools["show_widget"]!.execute!(
        { title: "x", widget_code: "<p>x</p>" },
        { toolCallId: "never-rendered" },
      );
      await vi.advanceTimersByTimeAsync(10_000);
      expect(await late).toMatchObject({ render: { status: "timeout" } });
    } finally {
      vi.useRealTimers();
    }
  });

  it("returns immediately without render reports", async () => {
    const tools = entries(createWidgetToolkit({ renderReport: false }).toolkit);
    expect(
      await tools["show_widget"]!.execute!(
        { title: "w", widget_code: "<p>a</p>" },
        { toolCallId: "a" },
      ),
    ).not.toHaveProperty("render");
  });

  it("previews in the browser and drops the screenshot by default", async () => {
    mocks.preview.mockResolvedValue({
      ok: true,
      kind: "html",
      width: 680,
      height: 90,
      blank: false,
      errors: [],
      console: [],
      screenshot: "data:image/png;base64,AAAA",
    });
    const tools = entries(createWidgetToolkit().toolkit);
    const result = await tools["preview_widget"]!.execute!({
      widget_code: "<p>a</p>",
      width: 400,
    });
    expect(mocks.preview).toHaveBeenCalledWith("<p>a</p>", { width: 400 });
    expect(result).not.toHaveProperty("screenshot");
    expect(result).toMatchObject({ ok: true, height: 90 });
    const withShot = entries(
      createWidgetToolkit({ previewScreenshot: true }).toolkit,
    );
    expect(
      await withShot["preview_widget"]!.execute!({ widget_code: "<p>a</p>" }),
    ).toHaveProperty("screenshot");
  });

  it("previews with the frame mode of the displayed widgets", async () => {
    mocks.preview.mockResolvedValue({
      ok: true,
      kind: "html",
      width: 680,
      height: 90,
      blank: false,
      errors: [],
      console: [],
    });
    const tools = entries(
      createWidgetToolkit({ widget: { opaqueOrigin: true } }).toolkit,
    );
    await tools["preview_widget"]!.execute!({ widget_code: "<p>a</p>" });
    expect(mocks.preview).toHaveBeenCalledWith("<p>a</p>", {
      opaqueOrigin: true,
    });
  });

  it("gives each widget a host-derived storage id shared by its edits", () => {
    mocks.messages = [
      {
        content: [
          call("a", "show_widget", { title: "w", widget_code: "<p>one</p>" }),
          call("b", "edit_widget", {
            title: "w",
            edits: [{ old_string: "one", new_string: "two" }],
          }),
        ],
      },
    ];
    expect(resolveWidgetOrigin(mocks.messages as never, "b")).toBe("a");
    expect(resolveWidgetOrigin(mocks.messages as never, "zzz")).toBeUndefined();

    mocks.propStatus = { widget_code: "complete" };
    const { toolkit } = createWidgetToolkit();
    const ShowWidget = entries(toolkit)["show_widget"]!.render;
    const EditWidget = entries(toolkit)["edit_widget"]!.render;
    render(
      <ShowWidget
        {...partProps("a", { title: "w", widget_code: "<p>one</p>" })}
      />,
    );
    expect(mocks.widgetProps.at(-1)).toMatchObject({ id: "aui:a" });
    render(<EditWidget {...partProps("b", { title: "w" })} />);
    expect(mocks.widgetProps.at(-1)).toMatchObject({ id: "aui:a" });

    const custom = createWidgetToolkit({
      widgetId: ({ toolCallId, threadId }) =>
        `${threadId ?? "x"}-7:${toolCallId}`,
    });
    const CustomShow = entries(custom.toolkit)["show_widget"]!.render;
    render(
      <CustomShow
        {...partProps("a", { title: "w", widget_code: "<p>one</p>" })}
      />,
    );
    expect(mocks.widgetProps.at(-1)).toMatchObject({ id: "x-7:a" });

    mocks.remoteId = "thread_1";
    render(
      <ShowWidget
        {...partProps("a", { title: "w", widget_code: "<p>one</p>" })}
      />,
    );
    expect(mocks.widgetProps.at(-1)).toMatchObject({ id: "thread_1:a" });
    mocks.remoteId = undefined;

    const fresh = createWidgetToolkit({ widgetId: false });
    const FreshShow = entries(fresh.toolkit)["show_widget"]!.render;
    render(
      <FreshShow
        {...partProps("a", { title: "w", widget_code: "<p>one</p>" })}
      />,
    );
    expect(mocks.widgetProps.at(-1)).not.toHaveProperty("id");
  });

  it("renders edit_widget with code replayed from the thread", () => {
    const { toolkit, registry } = createWidgetToolkit();
    const EditWidget = entries(toolkit)["edit_widget"]!.render;
    mocks.messages = [
      {
        content: [
          call("a", "show_widget", { title: "w", widget_code: "<p>one</p>" }),
          call("b", "edit_widget", {
            title: "w",
            edits: [{ old_string: "one", new_string: "two" }],
          }),
        ],
      },
    ];
    mocks.argsStatus = "streaming";
    const view = render(<EditWidget {...partProps("b", { title: "w" })} />);
    expect(view.getByRole("status").textContent).toBe("Updating w…");
    mocks.argsStatus = "complete";
    view.rerender(<EditWidget {...partProps("b", { title: "w" })} />);
    expect(mocks.widgets.at(-1)!.code).toBe("<p>two</p>");
    expect(registry.get("w")?.code).toBe("<p>two</p>");

    const failed = render(<EditWidget {...partProps("zzz", { title: "w" })} />);
    expect(failed.getByRole("note").textContent).toBe(
      "w could not be updated.",
    );
  });

  it("renders render_spec progressively from streamed patches", () => {
    const { toolkit } = createWidgetToolkit({
      spec: createSpecToolkit(catalog, { components }),
    });
    const RenderSpec = entries(toolkit)["render_spec"]!.render;
    const lines = [
      '{"op":"add","path":"/root","value":"t"}',
      '{"op":"add","path":"/elements/t","value":{"type":"Text","props":{"text":"Hello"}}}',
    ];
    mocks.argsStatus = "streaming";
    const view = render(
      <RenderSpec
        {...partProps("s", { title: "s", patches: `${lines[0]}\n` })}
      />,
    );
    expect(
      view.container.querySelector('[data-gf-spec-placeholder="pending"]'),
    ).not.toBeNull();
    mocks.argsStatus = "complete";
    view.rerender(
      <RenderSpec
        {...partProps("s", { title: "s", patches: lines.join("\n") })}
      />,
    );
    expect(view.container.textContent).toBe("Hello");
  });
});

describe("useWidgetInstructions", () => {
  it("registers the instructions once built", async () => {
    const { tools } = createWidgetToolkit({
      spec: createSpecToolkit(catalog, { components }),
    });
    renderHook(() =>
      useWidgetInstructions(tools, { preload: { modules: ["spec"] } }),
    );
    expect(mocks.instructions[0]).toEqual({ instruction: "", disabled: true });
    await act(async () => {});
    const last = mocks.instructions.at(-1) as {
      instruction: string;
      disabled: boolean;
    };
    expect(last.disabled).toBe(false);
    expect(last.instruction).toContain("## Visual widgets");
    expect(last.instruction).toContain("# Declarative UI");
  });
});
