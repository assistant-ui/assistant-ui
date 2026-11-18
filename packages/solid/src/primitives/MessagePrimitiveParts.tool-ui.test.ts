import { afterEach, describe, expect, it, vi } from "vitest";
import { createComponent, type Component } from "solid-js";
import { Dynamic, render } from "solid-js/web";
import { flushTapSync, resource } from "@assistant-ui/tap";
import { AuiConfig, type AssistantClient } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
import { Tools, type Toolkit } from "@assistant-ui/core/react";
import type {
  ExternalStoreAdapter,
  ThreadMessageLike,
} from "@assistant-ui/core";
import {
  AssistantRuntimeImpl,
  ExternalStoreRuntimeCore,
} from "@assistant-ui/core/internal";
import { AuiProvider } from "../AuiProvider";
import { useAui } from "../useAui";
import { ThreadPrimitiveMessages } from "./ThreadPrimitiveMessages";
import {
  MessagePrimitiveParts,
  type ToolUIProps,
  type DataUIProps,
} from "./MessagePrimitiveParts";

type DemoMessage = {
  role: "assistant";
  content: ThreadMessageLike["content"];
  status?: { type: "running" };
};
const toolCallMessage = (toolName: string): DemoMessage => ({
  role: "assistant",
  content: [
    { type: "tool-call", toolCallId: "call-1", toolName, args: { city: "sf" } },
  ],
});
const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  const onAddToolResult = vi.fn();
  const onResumeToolCall = vi.fn();
  const onRespondToToolApproval = vi.fn();
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning: false,
    convertMessage: (message) => message,
    onNew: async () => {},
    onAddToolResult,
    onResumeToolCall,
    onRespondToToolApproval,
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  return {
    runtime: new AssistantRuntimeImpl(core),
    replace: (message: DemoMessage) => {
      messages = [message];
      core.setAdapter(makeAdapter());
    },
    onAddToolResult,
    onResumeToolCall,
    onRespondToToolApproval,
  };
};
const disposers: (() => void)[] = [];
afterEach(() => {
  disposers.splice(0).forEach((dispose) => dispose());
  vi.restoreAllMocks();
});
const mount = (
  runtime: AssistantRuntimeImpl,
  config: Parameters<typeof AuiConfig>[0] = {},
  components: Parameters<typeof MessagePrimitiveParts>[0]["components"] = {
    "tool-call": () =>
      createComponent(Dynamic, {
        component: "span",
        class: "slot",
        children: "[slot]",
      }),
  },
) => {
  let client!: AssistantClient;
  const Capture = () => {
    client = useAui();
    return null;
  };
  const el = document.createElement("div");
  document.body.append(el);
  const dispose = render(
    () =>
      createComponent(AuiProvider, {
        config: AuiConfig({ threads: RuntimeAdapter(runtime), ...config }),
        get children() {
          return [
            createComponent(Capture, {}),
            createComponent(ThreadPrimitiveMessages, {
              get children() {
                return createComponent(MessagePrimitiveParts, { components });
              },
            }),
          ];
        },
      }),
    el,
  );
  disposers.push(() => {
    dispose();
    el.remove();
  });
  return { el, client: () => client };
};
const span =
  (className: string, text: string): Component =>
  () =>
    createComponent(Dynamic, {
      component: "span",
      class: className,
      children: text,
    });

describe("MessagePrimitiveParts tool UI registry", () => {
  it("renders a registered tool UI over the tool-call component with the part and callbacks", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime);
    const Weather = (props: { tool: ToolUIProps }) =>
      createComponent(Dynamic, {
        component: "span",
        class: "ui",
        get children() {
          return [
            props.tool.part.toolName,
            (props.tool.part.args as { city: string }).city,
            typeof props.tool.addResult,
            typeof props.tool.resume,
            typeof props.tool.respondToApproval,
          ].join(",");
        },
      });
    flushTapSync(() => client().tools.setToolUI("weather", Weather as never));
    flushTapSync(() => replace(toolCallMessage("weather")));
    expect(el.querySelector("span.ui")?.textContent).toBe(
      "weather,sf,function,function,function",
    );
    expect(el.querySelector("span.slot")).toBeNull();
  });

  it("routes addResult, resume, and respondToApproval to the adapter callbacks", async () => {
    const {
      runtime,
      replace,
      onAddToolResult,
      onResumeToolCall,
      onRespondToToolApproval,
    } = createTestRuntime();
    const { el, client } = mount(runtime);
    const CallbackTool = (props: { tool: ToolUIProps }) => [
      createComponent(Dynamic, {
        component: "button",
        class: "add-result",
        onClick: () => props.tool.addResult("72F"),
        children: "add",
      }),
      createComponent(Dynamic, {
        component: "button",
        class: "resume",
        onClick: () => props.tool.resume("continue"),
        children: "resume",
      }),
      createComponent(Dynamic, {
        component: "button",
        class: "approve",
        onClick: () => props.tool.respondToApproval({ approved: true }),
        children: "approve",
      }),
    ];
    flushTapSync(() =>
      client().tools.setToolUI("weather", CallbackTool as never),
    );
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "weather",
            args: { city: "sf" },
            approval: { id: "approval-1" },
          },
        ],
      }),
    );
    el.querySelector<HTMLButtonElement>("button.add-result")!.click();
    await vi.waitFor(() => expect(onAddToolResult).toHaveBeenCalledTimes(1));
    expect(onAddToolResult.mock.calls[0]![0]).toMatchObject({
      toolCallId: "call-1",
      toolName: "weather",
      result: "72F",
    });
    el.querySelector<HTMLButtonElement>("button.resume")!.click();
    await vi.waitFor(() => expect(onResumeToolCall).toHaveBeenCalledTimes(1));
    expect(onResumeToolCall.mock.calls[0]![0]).toMatchObject({
      toolCallId: "call-1",
      payload: "continue",
    });
    el.querySelector<HTMLButtonElement>("button.approve")!.click();
    await vi.waitFor(() =>
      expect(onRespondToToolApproval).toHaveBeenCalledTimes(1),
    );
    expect(onRespondToToolApproval.mock.calls[0]![0]).toMatchObject({
      approvalId: "approval-1",
      approved: true,
    });
  });

  it("falls back to the tool-call component and swaps live on register/unregister", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime);
    flushTapSync(() => replace(toolCallMessage("weather")));
    expect(el.querySelector("span.slot")?.textContent).toBe("[slot]");
    let dispose!: () => void;
    flushTapSync(() => {
      dispose = client().tools.setToolUI("weather", span("ui", "ui") as never);
    });
    expect(el.querySelector("span.ui")?.textContent).toBe("ui");
    expect(el.querySelector("span.slot")).toBeNull();
    flushTapSync(dispose);
    expect(el.querySelector("span.slot")?.textContent).toBe("[slot]");
    expect(el.querySelector("span.ui")).toBeNull();
  });

  it("renders tools.mcpApp for a tool call with a ui:// resource", () => {
    const { runtime, replace } = createTestRuntime();
    const Mcp = (props: { tool: ToolUIProps }) =>
      createComponent(Dynamic, {
        component: "span",
        class: "mcp",
        get children() {
          return props.tool.part.toolName;
        },
      });
    const McpApp = resource(function McpApp() {
      return { render: Mcp as never };
    });
    const { el, client } = mount(runtime, {
      tools: Tools({ mcpApp: McpApp() }),
    });
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "show_chart",
            args: {},
            mcp: { app: { resourceUri: "ui://chart" } },
          },
        ],
      }),
    );
    expect(el.querySelector("span.mcp")?.textContent).toBe("show_chart");
    expect(el.querySelector("span.mcp")?.getAttribute("tool")).toBeNull();
    expect(el.querySelector("span.mcp")?.getAttribute("name")).toBeNull();
    expect(el.querySelector("span.slot")).toBeNull();
    flushTapSync(() =>
      client().tools.setToolUI("show_chart", span("ui", "registered") as never),
    );
    expect(el.querySelector("span.ui")?.textContent).toBe("registered");
    expect(el.querySelector("span.mcp")).toBeNull();
  });

  it("renders a registered data renderer for a data part", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime, {}, { data: span("slot", "[slot]") });
    const Chart = (props: { data: DataUIProps<{ a: number }> }) =>
      createComponent(Dynamic, {
        component: "span",
        class: "data",
        get children() {
          return String(props.data.part.data.a);
        },
      });
    flushTapSync(() =>
      client().dataRenderers.setDataUI("chart", Chart as never),
    );
    flushTapSync(() =>
      client().dataRenderers.setFallbackDataUI(
        span("fallback", "fallback") as never,
      ),
    );
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [{ type: "data", name: "chart", data: { a: 1 } }],
      }),
    );
    expect(el.querySelector("span.data")?.textContent).toBe("1");
    expect(el.querySelector("span.data")?.getAttribute("type")).toBeNull();
    expect(el.querySelector("span.data")?.getAttribute("name")).toBeNull();
    expect(el.querySelector("span.data")?.getAttribute("data")).toBeNull();
    expect(el.querySelector("span.slot")).toBeNull();
    expect(el.querySelector("span.fallback")).toBeNull();
  });

  it("uses the fallback data renderer and keeps its payload isolated", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime);
    const Fallback = (props: { data: DataUIProps<{ value: string }> }) =>
      createComponent(Dynamic, {
        component: "span",
        class: "fallback",
        get children() {
          return props.data.part.data.value;
        },
      });
    flushTapSync(() =>
      client().dataRenderers.setFallbackDataUI(Fallback as never),
    );
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [
          { type: "data", name: "unknown", data: { value: "fallback" } },
        ],
      }),
    );
    expect(el.querySelector("span.fallback")?.textContent).toBe("fallback");
    expect(el.querySelector("span.fallback")?.getAttribute("name")).toBeNull();
    expect(el.querySelector("span.fallback")?.getAttribute("data")).toBeNull();
  });

  it("uses the data component when no renderer is registered", () => {
    const { runtime, replace } = createTestRuntime();
    const { el } = mount(runtime, {}, { data: span("slot", "[slot]") });
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [{ type: "data", name: "unknown", data: { value: "slot" } }],
      }),
    );
    expect(el.querySelector("span.slot")?.textContent).toBe("[slot]");
  });

  it("does not route registrations for other tool names", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime);
    flushTapSync(() =>
      client().tools.setToolUI("search", span("ui", "ui") as never),
    );
    flushTapSync(() => replace(toolCallMessage("weather")));
    expect(el.querySelector("span.slot")).not.toBeNull();
    expect(el.querySelector("span.ui")).toBeNull();
  });

  it("uses the first registration when a tool name is registered twice", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime);
    flushTapSync(() =>
      client().tools.setToolUI("weather", span("first", "first") as never),
    );
    flushTapSync(() =>
      client().tools.setToolUI("weather", span("second", "second") as never),
    );
    flushTapSync(() => replace(toolCallMessage("weather")));
    expect(el.querySelector("span.first")?.textContent).toBe("first");
    expect(el.querySelector("span.second")).toBeNull();
  });

  it("renders nothing for a React element valued renderText descriptor", () => {
    const { runtime, replace } = createTestRuntime();
    const toolkit = {
      weather: {
        type: "frontend",
        description: "Looks up the weather.",
        parameters: { type: "object", properties: {} },
        execute: async () => "sunny",
        renderText: {
          running: () => ({ reactElement: true }),
          complete: () => ({ reactElement: true }),
        },
      },
    } as unknown as Toolkit;
    const { el } = mount(runtime, { tools: Tools({ toolkit }) });
    flushTapSync(() =>
      replace({ ...toolCallMessage("weather"), status: { type: "running" } }),
    );
    expect(el.textContent).toBe("");
    expect(el.querySelector("span.slot")).toBeNull();
  });

  it("renders toolkit renderText for running and complete tool calls", () => {
    const { runtime, replace } = createTestRuntime();
    const toolkit = {
      weather: {
        type: "frontend",
        description: "Looks up the weather.",
        parameters: { type: "object", properties: {} },
        execute: async () => "sunny",
        renderText: {
          running: ({ args }: { args: { city: string } }) =>
            `Checking ${args.city}...`,
          complete: ({
            args,
            result,
          }: {
            args: { city: string };
            result: string | undefined;
          }) => `${result} in ${args.city}`,
        },
      },
    } as unknown as Toolkit;
    const { el } = mount(runtime, { tools: Tools({ toolkit }) });
    flushTapSync(() =>
      replace({ ...toolCallMessage("weather"), status: { type: "running" } }),
    );
    expect(el.textContent).toBe("Checking sf...");
    flushTapSync(() =>
      replace({
        role: "assistant",
        status: { type: "running" },
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "weather",
            args: { city: "sf" },
            result: "sunny",
          },
        ],
      }),
    );
    expect(el.textContent).toBe("sunny in sf");
    expect(el.querySelector("span.slot")).toBeNull();
  });

  it("renders numeric renderText results including zero", () => {
    const { runtime, replace } = createTestRuntime();
    const toolkit = {
      weather: {
        type: "frontend",
        description: "Counts.",
        parameters: { type: "object", properties: {} },
        execute: async () => 0,
        renderText: { running: 0, complete: 7 },
      },
    } as unknown as Toolkit;
    const { el } = mount(runtime, { tools: Tools({ toolkit }) });
    flushTapSync(() =>
      replace({ ...toolCallMessage("weather"), status: { type: "running" } }),
    );
    expect(el.textContent).toBe("0");
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "weather",
            args: {},
            result: 0,
          },
        ],
      }),
    );
    expect(el.textContent).toBe("7");
  });

  it("updates registered renderer props without remounting the same renderer", () => {
    const { runtime, replace } = createTestRuntime();
    const { el, client } = mount(runtime);
    let toolMounts = 0;
    const Weather = (props: { tool: ToolUIProps }) => {
      toolMounts++;
      return createComponent(Dynamic, {
        component: "span",
        get children() {
          return String(props.tool.part.result ?? "running");
        },
      });
    };
    flushTapSync(() => client().tools.setToolUI("weather", Weather as never));
    flushTapSync(() =>
      replace({ ...toolCallMessage("weather"), status: { type: "running" } }),
    );
    expect(el.textContent).toBe("running");
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [
          {
            type: "tool-call",
            toolCallId: "call-1",
            toolName: "weather",
            args: {},
            result: "sunny",
          },
        ],
      }),
    );
    expect(el.textContent).toBe("sunny");
    expect(toolMounts).toBe(1);
    let dataMounts = 0;
    const Chart = (props: { data: DataUIProps<number> }) => {
      dataMounts++;
      return createComponent(Dynamic, {
        component: "span",
        get children() {
          return props.data.part.data;
        },
      });
    };
    flushTapSync(() =>
      client().dataRenderers.setDataUI("chart", Chart as never),
    );
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [{ type: "data", name: "chart", data: 1 }],
      }),
    );
    expect(el.textContent).toBe("1");
    flushTapSync(() =>
      replace({
        role: "assistant",
        content: [{ type: "data", name: "chart", data: 2 }],
      }),
    );
    expect(el.textContent).toBe("2");
    expect(dataMounts).toBe(1);
  });
});
