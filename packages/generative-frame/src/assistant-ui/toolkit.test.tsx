import { act, cleanup, render, renderHook } from "@testing-library/react";
import type { ComponentType } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../spec/catalog";
import type { SpecComponentProps } from "../react/SpecRenderer";
import { resolveSpecBase, resolveWidgetCode } from "./history";
import { createWidgetToolkit, useWidgetInstructions } from "./toolkit";

const mocks = vi.hoisted(() => ({
  append: vi.fn(),
  register: vi.fn(),
  messages: [] as unknown[],
  argsStatus: "complete" as "complete" | "streaming",
  propStatus: {} as Record<string, string>,
  instructions: [] as unknown[],
  widgetProps: [] as Record<string, unknown>[],
}));

vi.mock("@assistant-ui/react", () => ({
  useAui: () => ({ thread: { append: mocks.append } }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ thread: { messages: mocks.messages } }),
  useToolArgsStatus: () => ({
    status: "running",
    argsStatus: mocks.argsStatus,
    propStatus: mocks.propStatus,
  }),
  useAssistantInstructions: (config: unknown) =>
    mocks.instructions.push(config),
}));

vi.mock("../react/Widget", () => ({
  Widget: (props: Record<string, unknown>) => {
    mocks.widgetProps.push(props);
    return <div data-testid="widget">{String(props["code"])}</div>;
  },
}));

afterEach(() => {
  cleanup();
  mocks.messages = [];
  mocks.argsStatus = "complete";
  mocks.propStatus = {};
  mocks.instructions.length = 0;
  mocks.widgetProps.length = 0;
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
  execute?: (input: unknown) => Promise<unknown>;
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
    const { toolkit, registry } = createWidgetToolkit();
    const tools = entries(toolkit);
    expect(Object.keys(tools)).toEqual([
      "read_me",
      "show_widget",
      "edit_widget",
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

  it("renders only in backend mode and adds render_spec with a catalog", () => {
    const tools = entries(
      createWidgetToolkit({ execution: "backend", catalog, components })
        .toolkit,
    );
    expect(Object.keys(tools)).toEqual([
      "read_me",
      "show_widget",
      "edit_widget",
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
    expect(mocks.widgetProps.at(-1)).toMatchObject({
      code: "<p>par",
      streaming: true,
      maxHeight: 500,
    });
    expect(registry.get("w")).toBeUndefined();

    mocks.propStatus = { widget_code: "complete" };
    view.rerender(
      <ShowWidget
        {...partProps("a", { title: "w", widget_code: "<p>partial</p>" })}
      />,
    );
    expect(mocks.widgetProps.at(-1)).toMatchObject({
      code: "<p>partial</p>",
      streaming: false,
    });
    expect(registry.get("w")?.code).toBe("<p>partial</p>");

    (mocks.widgetProps.at(-1)!["onPrompt"] as (text: string) => void)(
      "Tell me more",
    );
    expect(mocks.append).toHaveBeenCalledWith("Tell me more");
    expect(mocks.widgetProps.at(-1)!["tokens"]).toMatchObject({
      colorScheme: "light",
    });
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
    expect(view.getByTestId("widget").textContent).toBe("<p>two</p>");
    expect(registry.get("w")?.code).toBe("<p>two</p>");

    const failed = render(<EditWidget {...partProps("zzz", { title: "w" })} />);
    expect(failed.getByRole("note").textContent).toBe(
      "w could not be updated.",
    );
  });

  it("renders render_spec progressively from streamed patches", () => {
    const { toolkit } = createWidgetToolkit({ catalog, components });
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

  it("explains a missing component map for render_spec", () => {
    const { toolkit } = createWidgetToolkit({ catalog });
    const RenderSpec = entries(toolkit)["render_spec"]!.render;
    const view = render(
      <RenderSpec {...partProps("s", { title: "s", patches: "" })} />,
    );
    expect(view.getByRole("note").textContent).toBe(
      "No components are configured for render_spec.",
    );
  });
});

describe("useWidgetInstructions", () => {
  it("registers the instructions once built", async () => {
    const { tools } = createWidgetToolkit({ catalog, components });
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
