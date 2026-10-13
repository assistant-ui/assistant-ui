// @vitest-environment jsdom
import type { Tools } from "@assistant-ui/core/react";
import {
  createApp,
  defineComponent,
  h,
  nextTick,
  shallowRef,
  type App,
  type Component,
} from "vue";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import type { Spec } from "../types";
import { createSpecToolkit } from "./vue";

const mocks = vi.hoisted(() => ({
  messages: [] as unknown[],
  append: vi.fn(),
  providers: new Set<{ getModelContext(): { system?: string } }>(),
}));

vi.mock("@assistant-ui/vue", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/vue")>()),
  useAui: () => ({
    thread: { append: mocks.append },
    modelContext: {
      register: (provider: { getModelContext(): { system?: string } }) => {
        mocks.providers.add(provider);
        return () => mocks.providers.delete(provider);
      },
    },
  }),
  useAuiState: (selector: (state: unknown) => unknown) => ({
    value: selector({ thread: { messages: mocks.messages } }),
  }),
}));

const apps: App[] = [];

afterEach(() => {
  for (const app of apps.splice(0)) app.unmount();
  document.body.replaceChildren();
  mocks.messages = [];
  mocks.providers.clear();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

const catalog = defineCatalog({
  components: {
    Label: {
      description: "Text",
      props: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
      slots: ["default"],
    },
    Button: {
      description: "Button",
      props: {
        type: "object",
        properties: { label: { type: "string" } },
        required: ["label"],
      },
      events: ["press"],
    },
  },
});

const components = {
  Label: defineComponent({
    props: { text: String },
    setup(props, { slots }) {
      return () => h("span", [props.text, slots["default"]?.()]);
    },
  }),
  Button: defineComponent({
    props: { label: String },
    emits: ["press"],
    setup(props, { emit }) {
      return () => h("button", { onClick: () => emit("press") }, props.label);
    },
  }),
};

type Entry = {
  type: string;
  execute?: (input: unknown, call: { toolCallId: string }) => unknown;
  render: Component;
};

const setup = (execution: "frontend" | "backend") => {
  const entries: Record<string, unknown> = createSpecToolkit(catalog, {
    components,
  }).entries({ execution, display: "standalone" });
  return entries["render_spec"] as Entry;
};

type Part = {
  id?: string;
  args: Record<string, unknown>;
  running?: boolean;
  interactions?: unknown;
};

const toolProp = (
  { id = "s", args, running, interactions }: Part,
  record?: (input: unknown) => Promise<void>,
) => ({
  part: {
    type: "tool-call",
    toolName: "render_spec",
    toolCallId: id,
    args,
    argsText: JSON.stringify(args),
    status: { type: running ? "running" : "complete" },
    ...(interactions ? { unstable_interactions: interactions } : {}),
  },
  ...(record ? { unstable_recordInteraction: record } : {}),
});

const mount = (render: Component, tool: unknown) => {
  const container = document.createElement("div");
  document.body.append(container);
  const current = shallowRef(tool);
  const app = createApp({ render: () => h(render, { tool: current.value }) });
  app.mount(container);
  apps.push(app);
  return { container, update: (next: unknown) => (current.value = next) };
};

const label = (text: unknown): Spec => ({
  root: "t",
  elements: { t: { type: "Label", props: { text } } },
  state: {},
});

describe("createSpecToolkit for Vue", () => {
  it("returns entries that Tools from @assistant-ui/core/react accepts", () => {
    const toolkit: Parameters<typeof Tools>[0]["toolkit"] = createSpecToolkit(
      catalog,
      { components: {} },
    ).entries({ execution: "frontend", display: "standalone" });
    expect(Object.keys(toolkit ?? {})).toEqual(["render_spec"]);
  });

  it("renders a render_spec call with Vue components", () => {
    const { container } = mount(setup("frontend").render, {
      ...toolProp({ args: { title: "s", spec: label("Hi") } }),
    });
    expect(container.querySelector('[data-gf-spec="s"]')?.textContent).toBe(
      "Hi",
    );
  });

  it("restores the state the user saved on the call", () => {
    const { container } = mount(
      setup("frontend").render,
      toolProp({
        args: {
          title: "s",
          spec: { ...label({ $state: "/name" }), state: { name: "model" } },
        },
        interactions: {
          entries: [
            {
              type: "action",
              occurredAt: 0,
              payload: {
                type: "setState",
                toolCallId: "s",
                writes: [["/name", "Ada"]],
              },
            },
          ],
        },
      }),
    );
    expect(container.textContent).toBe("Ada");
  });

  it("streams patches and shows pending children until the arguments complete", async () => {
    const patches =
      '{"op":"add","path":"/root","value":"t"}\n{"op":"add","path":"/elements/t","value":{"type":"Label","props":{"text":"Hi"},"children":["c"]}}\n';
    const { container, update } = mount(
      setup("backend").render,
      toolProp({ args: { title: "s", patches }, running: true }),
    );
    expect(
      container.querySelector('[data-gf-spec-placeholder="pending"]'),
    ).not.toBeNull();
    update(toolProp({ args: { title: "s", patches } }));
    await nextTick();
    expect(
      container.querySelector('[data-gf-spec-placeholder="pending"]'),
    ).toBeNull();
    expect(
      container.querySelector('[data-gf-spec-placeholder="missing"]'),
    ).not.toBeNull();
  });

  it("patches the earlier spec with the same title when the call mounts before its title arrives", async () => {
    const first = {
      title: "s",
      patches:
        '{"op":"add","path":"/root","value":"t"}\n{"op":"add","path":"/elements/t","value":{"type":"Label","props":{"text":"a"}}}',
    };
    const fromA = {
      title: "s",
      patches:
        '{"op":"test","path":"/elements/t/props/text","value":"a"}\n{"op":"replace","path":"/elements/t/props/text","value":"b"}',
    };
    mocks.messages = [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "e",
            toolName: "render_spec",
            args: first,
            argsText: JSON.stringify(first),
          },
          {
            type: "tool-call",
            toolCallId: "f",
            toolName: "render_spec",
            args: fromA,
            argsText: JSON.stringify(fromA),
          },
        ],
      },
    ];
    const { container, update } = mount(
      setup("frontend").render,
      toolProp({ id: "f", args: {}, running: true }),
    );
    update(toolProp({ id: "f", args: { title: "s" }, running: true }));
    await nextTick();
    update(toolProp({ id: "f", args: fromA, running: true }));
    await nextTick();
    expect(container.textContent).toBe("a");
    update(toolProp({ id: "f", args: fromA }));
    await nextTick();
    expect(container.textContent).toBe("b");
  });

  it("rebuilds on the same-title base when patches stream before the title", async () => {
    const first = {
      title: "s",
      patches:
        '{"op":"add","path":"/root","value":"t"}\n{"op":"add","path":"/elements/t","value":{"type":"Label","props":{"text":"a"}}}',
    };
    const patches =
      '{"op":"test","path":"/elements/t/props/text","value":"a"}\n{"op":"replace","path":"/elements/t/props/text","value":"b"}';
    mocks.messages = [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "e",
            toolName: "render_spec",
            args: first,
            argsText: JSON.stringify(first),
          },
        ],
      },
    ];
    const { container, update } = mount(
      setup("frontend").render,
      toolProp({ id: "f", args: { patches }, running: true }),
    );
    update(toolProp({ id: "f", args: { patches, title: "s" }, running: true }));
    await nextTick();
    update(
      toolProp({
        id: "f",
        args: { patches: `${patches}\n`, title: "s" },
        running: true,
      }),
    );
    await nextTick();
    expect(container.textContent).toBe("b");
  });

  it("shares the user's choice before sendMessage starts a request, and never sends from watch", async () => {
    let system: string | undefined;
    mocks.append.mockImplementation(() => {
      system = [...mocks.providers]
        .map((provider) => provider.getModelContext().system)
        .join("");
    });
    const { container } = mount(
      setup("frontend").render,
      toolProp({
        args: {
          title: "s",
          spec: {
            root: "t",
            elements: {
              t: {
                type: "Label",
                props: { text: { $template: "n=${/n}" } },
                children: ["b"],
              },
              b: {
                type: "Button",
                props: { label: "Pick A" },
                on: {
                  press: [
                    { action: "updateModelContext", params: { text: "A" } },
                    { action: "sendMessage", params: { text: "Tell me more" } },
                    { action: "setState", params: { path: "/n", value: 1 } },
                  ],
                },
                watch: {
                  "/n": { action: "sendMessage", params: { text: "watched" } },
                },
              },
            },
            state: {},
          },
        },
      }),
    );
    container.querySelector("button")!.click();
    await vi.waitFor(() => expect(container.textContent).toContain("n=1"));
    await nextTick();
    expect(mocks.append).toHaveBeenCalledExactlyOnceWith("Tell me more");
    expect(system).toContain('<ui_choices>{"text":"A"}</ui_choices>');
  });

  it("fails a watch-triggered send before later actions run", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const record = vi.fn(async (_input: unknown) => {});
    const { container } = mount(
      setup("frontend").render,
      toolProp(
        {
          args: {
            title: "s",
            spec: {
              root: "b",
              elements: {
                b: {
                  type: "Button",
                  props: { label: "Go" },
                  on: {
                    press: {
                      action: "setState",
                      params: { path: "/n", value: 1 },
                    },
                  },
                  watch: {
                    "/n": [
                      {
                        action: "sendMessage",
                        params: { text: "watched" },
                      },
                      {
                        action: "setState",
                        params: { path: "/sent", value: true },
                      },
                    ],
                  },
                },
              },
              state: {},
            },
          },
        },
        record,
      ),
    );
    container.querySelector("button")!.click();
    await vi.advanceTimersByTimeAsync(500);
    expect(mocks.append).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "[generative-frame]",
      expect.stringContaining("sendMessage runs only from an event"),
    );
    expect(record).toHaveBeenLastCalledWith({
      type: "action",
      payload: {
        type: "setState",
        toolCallId: "s",
        writes: [["/n", 1]],
      },
    });
  });

  it("fails an empty send before later actions run", async () => {
    vi.useFakeTimers();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const record = vi.fn(async (_input: unknown) => {});
    const { container } = mount(
      setup("frontend").render,
      toolProp(
        {
          args: {
            title: "s",
            spec: {
              root: "b",
              elements: {
                b: {
                  type: "Button",
                  props: { label: "Go" },
                  on: {
                    press: [
                      { action: "sendMessage", params: { text: "" } },
                      {
                        action: "setState",
                        params: { path: "/sent", value: true },
                      },
                    ],
                  },
                },
              },
              state: {},
            },
          },
        },
        record,
      ),
    );
    container.querySelector("button")!.click();
    await vi.advanceTimersByTimeAsync(500);
    expect(mocks.append).not.toHaveBeenCalled();
    expect(warn).toHaveBeenCalledExactlyOnceWith(
      "[generative-frame]",
      expect.stringContaining("sendMessage needs a non-empty string"),
    );
    expect(record).not.toHaveBeenCalled();
  });

  it("saves the user's changes on the call", async () => {
    vi.useFakeTimers();
    const record = vi.fn(async (_input: unknown) => {});
    const { container } = mount(
      setup("frontend").render,
      toolProp(
        {
          args: {
            title: "s",
            spec: {
              root: "b",
              elements: {
                b: {
                  type: "Button",
                  props: { label: "Go" },
                  on: {
                    press: {
                      action: "setState",
                      params: { path: "/n", value: 1 },
                    },
                  },
                },
              },
              state: {},
            },
          },
        },
        record,
      ),
    );
    container.querySelector("button")!.click();
    await vi.advanceTimersByTimeAsync(500);
    expect(record).toHaveBeenCalledExactlyOnceWith({
      type: "action",
      payload: { type: "setState", toolCallId: "s", writes: [["/n", 1]] },
    });
  });

  it("executes and validates in frontend execution only", async () => {
    const frontend = setup("frontend");
    expect(frontend.type).toBe("frontend");
    await expect(
      frontend.execute!({ title: "s", spec: label("Hi") }, { toolCallId: "s" }),
    ).resolves.toMatchObject({ ok: true });
    expect(setup("backend").type).toBe("backend");
  });
});
