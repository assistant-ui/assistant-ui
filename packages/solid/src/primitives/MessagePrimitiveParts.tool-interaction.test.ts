import { createComponent, Show, type JSX } from "solid-js";
import { render } from "solid-js/web";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MessagePrimitiveParts,
  type ToolUIProps,
} from "./MessagePrimitiveParts";

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
  useAuiState:
    <T>(selector: (state: unknown) => T) =>
    () =>
      selector({ ...fixture.state, part: fixture.part }),
}));
vi.mock("./PartByIndexProvider", async (importOriginal) => ({
  ...(await importOriginal<typeof import("./PartByIndexProvider")>()),
  PartByIndexProvider: (props: { children?: JSX.Element }) =>
    createComponent(Show, {
      when: true,
      keyed: true,
      get children() {
        return props.children;
      },
    }),
}));
const interaction = { type: "action" as const, payload: { choice: "retry" } };
let dispose: (() => void) | undefined;
beforeEach(() => {
  fixture.state.message.parts = [fixture.part];
  fixture.state.optional.tools.toolUIs = {};
});
afterEach(() => dispose?.());

describe("MessagePrimitiveParts tool interaction", () => {
  it("forwards unstable_recordInteraction to a registered tool UI", () => {
    const Tool = (props: { tool: ToolUIProps }) => {
      void props.tool.unstable_recordInteraction?.(interaction);
      return "weather";
    };
    fixture.state.optional.tools.toolUIs = { weather: [{ render: Tool }] };
    const target = document.createElement("div");
    dispose = render(() => createComponent(MessagePrimitiveParts, {}), target);
    expect(target.textContent).toBe("weather");
    expect(fixture.recordInteraction).toHaveBeenCalledWith(interaction);
  });
});
