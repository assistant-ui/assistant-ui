import { createApp, defineComponent, h, type PropType } from "vue";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { ToolUIProps } from "./MessagePrimitiveParts";
import { MessagePrimitiveParts } from "./MessagePrimitiveParts";

const fixture = vi.hoisted(() => ({
  recordInteraction: vi.fn(),
  part: {
    type: "tool-call",
    toolCallId: "call-1",
    toolName: "weather",
    args: {},
    argsText: "{}",
    status: { type: "complete" },
  },
  state: {
    message: { parts: [] as unknown[] },
    optional: { tools: { toolUIs: {} as Record<string, unknown> } },
  },
}));

vi.mock("../useAui", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../useAui")>()),
  useAui: () => ({
    part: {
      addToolResult: vi.fn(),
      resumeToolCall: vi.fn(),
      respondToToolApproval: vi.fn(),
      unstable_recordInteraction: fixture.recordInteraction,
    },
  }),
}));

vi.mock("../useAuiState", async (importOriginal) => ({
  ...(await importOriginal<typeof import("../useAuiState")>()),
  useAuiState: <T>(selector: (state: unknown) => T) => ({
    get value() {
      return selector({ ...fixture.state, part: fixture.part });
    },
  }),
}));

vi.mock("./PartByIndexProvider", async (importOriginal) => {
  const { defineComponent } = await import("vue");
  return {
    ...(await importOriginal<typeof import("./PartByIndexProvider")>()),
    PartByIndexProvider: defineComponent({
      setup(_, { slots }) {
        return () => slots.default?.();
      },
    }),
  };
});

const interaction = { type: "action" as const, payload: { choice: "retry" } };

let app: ReturnType<typeof createApp> | undefined;

beforeEach(() => {
  fixture.recordInteraction.mockReset();
  fixture.state.message.parts = [fixture.part];
  fixture.state.optional.tools.toolUIs = {};
});

afterEach(() => app?.unmount());

describe("MessagePrimitiveParts", () => {
  it("forwards unstable_recordInteraction to a registered tool UI", () => {
    const Tool = defineComponent({
      props: {
        tool: { type: Object as PropType<ToolUIProps>, required: true },
      },
      setup(props) {
        return () => {
          void props.tool.unstable_recordInteraction?.(interaction);
          return h("span", "weather");
        };
      },
    });
    fixture.state.optional.tools.toolUIs = { weather: [{ render: Tool }] };
    const target = document.createElement("div");
    app = createApp(MessagePrimitiveParts);

    app.mount(target);

    expect(fixture.recordInteraction).toHaveBeenCalledWith(interaction);
  });
});
