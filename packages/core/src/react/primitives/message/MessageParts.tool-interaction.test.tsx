// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { MessagePartComponent } from "./MessageParts";

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
    tools: { toolUIs: {} as Record<string, unknown> },
  },
}));

vi.mock("@assistant-ui/store", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@assistant-ui/store")>()),
  useAui: () => ({
    part: {
      addToolResult: vi.fn(),
      resumeToolCall: vi.fn(),
      respondToToolApproval: vi.fn(),
      unstable_recordInteraction: fixture.recordInteraction,
    },
  }),
  useAuiState: <T,>(selector: (state: unknown) => T) =>
    selector({ ...fixture.state, part: fixture.part }),
}));

const interaction = { type: "action" as const, payload: { choice: "retry" } };

afterEach(cleanup);

beforeEach(() => {
  fixture.recordInteraction.mockReset();
  fixture.state.tools.toolUIs = {};
});

describe("MessagePartComponent", () => {
  it.each(["override", "registered"] as const)(
    "forwards unstable_recordInteraction to the %s tool UI",
    (kind) => {
      const Tool = ({
        unstable_recordInteraction,
      }: {
        unstable_recordInteraction?:
          | ((input: typeof interaction) => Promise<void>)
          | undefined;
      }) => {
        void unstable_recordInteraction?.(interaction);
        return null;
      };
      const components =
        kind === "override" ? { tools: { Override: Tool } } : {};
      if (kind === "registered") {
        fixture.state.tools.toolUIs = { weather: [{ render: Tool }] };
      }

      render(<MessagePartComponent components={components} />);

      expect(fixture.recordInteraction).toHaveBeenCalledWith(interaction);
    },
  );
});
