// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  MessagePrimitiveUnstable_PartsGroupedByParentId,
  type MessagePrimitiveUnstable_PartsGrouped,
} from "./MessagePartsGrouped";

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
    tools: { toolUIs: {} as Record<string, unknown> },
    dataRenderers: { renderers: {}, fallbacks: [] },
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

vi.mock(
  "../../context/providers/PartByIndexProvider",
  async (importOriginal) => ({
    ...(await importOriginal<
      typeof import("../../context/providers/PartByIndexProvider")
    >()),
    PartByIndexProvider: ({ children }: { children: ReactNode }) => children,
  }),
);

const interaction = { type: "action" as const, payload: { choice: "retry" } };

afterEach(cleanup);

beforeEach(() => {
  fixture.recordInteraction.mockReset();
  fixture.state.message.parts = [fixture.part];
  fixture.state.tools.toolUIs = {};
});

describe("MessagePrimitive.Unstable_PartsGrouped", () => {
  it.each(["override", "registered"] as const)(
    "forwards unstable_recordInteraction to the %s tool UI",
    (kind) => {
      const Tool = ({
        unstable_recordInteraction,
      }: {
        unstable_recordInteraction?: (
          input: typeof interaction,
        ) => Promise<void>;
      }) => {
        void unstable_recordInteraction?.(interaction);
        return null;
      };
      const components = (
        kind === "override"
          ? { tools: { Override: Tool } }
          : { tools: { by_name: { weather: Tool } } }
      ) satisfies MessagePrimitiveUnstable_PartsGrouped.Props["components"];

      render(
        <MessagePrimitiveUnstable_PartsGroupedByParentId
          components={components}
        />,
      );

      expect(fixture.recordInteraction).toHaveBeenCalledWith(interaction);
    },
  );
});
