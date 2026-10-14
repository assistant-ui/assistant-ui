// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import type { ComponentType } from "react";
import { Text, View } from "react-native";
import type { Tools } from "@assistant-ui/react-native";
import { afterEach, describe, expect, it, vi } from "vitest";
import { defineCatalog } from "../catalog";
import type { SpecComponentProps } from "../react/SpecRenderer";
import {
  createSpecToolkit,
  type SpecToolkitOptions,
} from "../assistant-ui.native";

const mocks = vi.hoisted(() => ({
  messages: [] as unknown[],
  argsStatus: "complete",
}));

vi.mock("@assistant-ui/react-native", () => ({
  useAui: () => ({
    thread: { append: () => undefined },
    modelContext: { register: () => () => undefined },
  }),
  useAuiState: (selector: (state: unknown) => unknown) =>
    selector({ thread: { messages: mocks.messages } }),
  useToolArgsStatus: () => ({ argsStatus: mocks.argsStatus }),
}));

vi.mock("@assistant-ui/react", () => {
  throw new Error("the React Native toolkit loaded @assistant-ui/react");
});

afterEach(cleanup);

const catalog = defineCatalog({
  components: {
    Label: {
      description: "Text",
      props: {
        type: "object",
        properties: { text: { type: "string" } },
        required: ["text"],
      },
    },
  },
});

type Entry = {
  type: string;
  execute?:
    | ((input: unknown, call: { toolCallId: string }) => Promise<unknown>)
    | undefined;
  render: ComponentType<Record<string, unknown>>;
};

const setup = (execution: "frontend" | "backend") =>
  createSpecToolkit(catalog, {
    components: {
      Label: ({ props, children }: SpecComponentProps<{ text: string }>) => (
        <View>
          <Text>{props.text}</Text>
          {children}
        </View>
      ),
    },
  }).entries({ execution, display: "standalone" }) as Record<string, Entry>;

describe("createSpecToolkit for React Native", () => {
  it("returns entries that Tools from @assistant-ui/react-native accepts", () => {
    const toolkit: Parameters<typeof Tools>[0]["toolkit"] = createSpecToolkit(
      catalog,
      { components: {} },
    ).entries({ execution: "frontend", display: "standalone" });
    expect(Object.keys(toolkit ?? {})).toEqual(["render_spec"]);
  });

  it("documents copyText only when the app handles it", () => {
    const guidance = (options: Omit<SpecToolkitOptions, "components">) =>
      (createSpecToolkit(catalog, { components: {}, ...options }).modules ?? [])
        .map((module) => module.guidance())
        .join("\n\n");
    expect(guidance({})).toContain("`sendMessage`");
    expect(guidance({})).not.toContain("`copyText`");
    expect(
      guidance({
        handlers: { copyText: () => {} },
        specPrompt: { hostApi: { clipboard: true } },
      }),
    ).toContain("- `copyText` — params `{ text: string }`.");
  });

  const spec = {
    root: "t",
    elements: { t: { type: "Label", props: { text: "Hi" } } },
    state: {},
  };

  it("renders a render_spec call with React Native views and no DOM wrapper", () => {
    mocks.messages = [
      {
        content: [
          {
            type: "tool-call",
            toolCallId: "s",
            toolName: "render_spec",
            args: { title: "s", spec },
            argsText: "",
          },
        ],
      },
    ];
    const RenderSpec = setup("frontend")["render_spec"]!.render;
    const view = render(
      <RenderSpec args={{ title: "s", spec }} toolCallId="s" />,
    );
    expect(view.container.textContent).toBe("Hi");
    expect(view.container.querySelector("[data-gf-spec]")).toBeNull();
  });

  it("restores the state the user saved on the call", () => {
    mocks.messages = [];
    const RenderSpec = setup("frontend")["render_spec"]!.render;
    const view = render(
      <RenderSpec
        args={{
          title: "s",
          spec: {
            root: "t",
            elements: {
              t: { type: "Label", props: { text: { $state: "/name" } } },
            },
            state: { name: "model" },
          },
        }}
        toolCallId="s"
        unstable_interactions={{
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
        }}
      />,
    );
    expect(view.container.textContent).toBe("Ada");
  });

  it("shows a streaming call with the React Native placeholder", () => {
    mocks.argsStatus = "streaming";
    mocks.messages = [];
    const RenderSpec = setup("backend")["render_spec"]!.render;
    const view = render(
      <RenderSpec
        args={{
          title: "s",
          patches:
            '{"op":"add","path":"/root","value":"t"}\n{"op":"add","path":"/elements/t","value":{"type":"Label","props":{"text":"Hi"},"children":["c"]}}\n',
        }}
        toolCallId="s"
      />,
    );
    expect(
      view.container.querySelector(
        '[data-testid="gf-spec-placeholder-pending"]',
      ),
    ).not.toBeNull();
    mocks.argsStatus = "complete";
  });

  it("executes and validates in frontend execution only", async () => {
    const frontend = setup("frontend")["render_spec"]!;
    expect(frontend.type).toBe("frontend");
    await expect(
      frontend.execute!({ title: "s", spec }, { toolCallId: "s" }),
    ).resolves.toMatchObject({ ok: true });
    expect(setup("backend")["render_spec"]!.type).toBe("backend");
  });
});
