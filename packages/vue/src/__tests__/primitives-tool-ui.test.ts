import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.restoreAllMocks();
  clearPartWarningsForTesting();
});
import { createApp, defineComponent, h, nextTick, type Component } from "vue";
import { flushTapSync } from "@assistant-ui/tap";
import { AuiConfig } from "@assistant-ui/store/client";
import { RuntimeAdapter } from "@assistant-ui/core/store";
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
import { ThreadPrimitiveMessages } from "../primitives/ThreadPrimitiveMessages";
import {
  MessagePrimitiveParts,
  clearPartWarningsForTesting,
} from "../primitives/MessagePrimitiveParts";

type DemoMessage = {
  role: "user" | "assistant";
  content: ThreadMessageLike["content"];
};

const createTestRuntime = () => {
  let messages: DemoMessage[] = [];
  const makeAdapter = (): ExternalStoreAdapter<DemoMessage> => ({
    messages,
    isRunning: false,
    convertMessage: (message) => ({
      role: message.role,
      content: message.content,
    }),
    onNew: async () => {},
  });
  const core = new ExternalStoreRuntimeCore(makeAdapter());
  const runtime = new AssistantRuntimeImpl(core);
  const append = (message: DemoMessage) => {
    messages = [...messages, message];
    core.setAdapter(makeAdapter());
  };
  return { runtime, append };
};

const mountChat = (runtime: AssistantRuntimeImpl, view: Component) => {
  let client: any;
  const CaptureClient = defineComponent({
    setup() {
      client = useAui();
      return () => null;
    },
  });
  const app = createApp(
    defineComponent({
      setup: () => () =>
        h(
          AuiProvider,
          { config: AuiConfig({ threads: RuntimeAdapter(runtime) }) },
          { default: () => [h(CaptureClient), h(view)] },
        ),
    }),
  );
  const el = document.createElement("div");
  app.mount(el);
  return { el, client: () => client, unmount: () => app.unmount() };
};

const toolCallMessage = (toolName: string): DemoMessage => ({
  role: "assistant",
  content: [
    {
      type: "tool-call",
      toolCallId: "call-1",
      toolName,
      args: { city: "sf" },
    },
  ],
});

const PartsWithToolSlot = defineComponent({
  setup: () => () =>
    h("li", null, [
      h(ThreadPrimitiveMessages, null, {
        default: () =>
          h(MessagePrimitiveParts, null, {
            "tool-call": () => h("span", { class: "slot" }, "[slot]"),
          }),
      }),
    ]),
});

describe("MessagePrimitiveParts tool UI registry", () => {
  it("renders a registered tool UI over the tool-call slot and passes part props with callbacks", async () => {
    const { runtime, append } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, PartsWithToolSlot);

    const WeatherTool = defineComponent({
      props: ["toolName", "args", "addResult", "resume", "respondToApproval"],
      setup: (props: any) => () =>
        h(
          "span",
          { class: "ui" },
          [
            props.toolName,
            props.args?.city,
            typeof props.addResult,
            typeof props.resume,
            typeof props.respondToApproval,
          ].join(","),
        ),
    });

    flushTapSync(() => client().tools.setToolUI("weather", WeatherTool));
    flushTapSync(() => append(toolCallMessage("weather")));

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.ui")).not.toBeNull();
    });
    expect(el.querySelector("span.ui")!.textContent).toBe(
      "weather,sf,function,function,function",
    );
    expect(el.querySelector("span.slot")).toBeNull();

    unmount();
  });

  it("falls back to the tool-call slot without a matching registration and swaps live on register/unregister", async () => {
    const { runtime, append } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, PartsWithToolSlot);

    flushTapSync(() => append(toolCallMessage("weather")));
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.slot")).not.toBeNull();
    });

    const Ui = defineComponent({
      setup: () => () => h("span", { class: "ui" }, "ui"),
    });
    let dispose: () => void;
    flushTapSync(() => {
      dispose = client().tools.setToolUI("weather", Ui);
    });
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.ui")).not.toBeNull();
      expect(el.querySelector("span.slot")).toBeNull();
    });

    flushTapSync(() => dispose());
    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.slot")).not.toBeNull();
      expect(el.querySelector("span.ui")).toBeNull();
    });

    unmount();
  });

  it("does not route registrations for other tool names", async () => {
    const { runtime, append } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, PartsWithToolSlot);

    const Ui = defineComponent({
      setup: () => () => h("span", { class: "ui" }, "ui"),
    });
    flushTapSync(() => client().tools.setToolUI("search", Ui));
    flushTapSync(() => append(toolCallMessage("weather")));

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.slot")).not.toBeNull();
    });
    expect(el.querySelector("span.ui")).toBeNull();

    unmount();
  });

  it("uses the first registration when a tool name is registered twice", async () => {
    const { runtime, append } = createTestRuntime();
    const { el, client, unmount } = mountChat(runtime, PartsWithToolSlot);

    const First = defineComponent({
      setup: () => () => h("span", { class: "first" }, "first"),
    });
    const Second = defineComponent({
      setup: () => () => h("span", { class: "second" }, "second"),
    });
    flushTapSync(() => client().tools.setToolUI("weather", First));
    flushTapSync(() => client().tools.setToolUI("weather", Second));
    flushTapSync(() => append(toolCallMessage("weather")));

    await vi.waitFor(async () => {
      await nextTick();
      expect(el.querySelector("span.first")).not.toBeNull();
    });
    expect(el.querySelector("span.second")).toBeNull();

    unmount();
  });
});
