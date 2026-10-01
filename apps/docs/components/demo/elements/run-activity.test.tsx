// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import {
  afterAll,
  afterEach,
  beforeAll,
  describe,
  expect,
  it,
  vi,
} from "vitest";
import {
  ActivityRunExample,
  activityStatus,
  convertRun,
  type ActivityRun,
} from "./run-activity";
import type { ToolCallMessagePart } from "@assistant-ui/react";

beforeAll(() => {
  Object.defineProperty(HTMLElement.prototype, "scrollTo", {
    value: vi.fn(),
    configurable: true,
  });
  vi.stubGlobal(
    "ResizeObserver",
    class {
      observe() {}
      unobserve() {}
      disconnect() {}
    },
  );
});

afterAll(() => {
  vi.unstubAllGlobals();
  Reflect.deleteProperty(HTMLElement.prototype, "scrollTo");
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

const RUN: ActivityRun = {
  id: "run-1",
  status: { type: "complete", reason: "stop" },
  timing: { startedAt: 1000, completedAt: 134000 },
  parts: [
    {
      id: "commentary-1",
      kind: "commentary",
      label: "Inspecting",
      part: { type: "text", text: "I’ll inspect the files." },
    },
    {
      id: "tool-1",
      kind: "tool",
      label: "Reading source",
      part: {
        type: "tool-call",
        toolCallId: "tool-1",
        toolName: "read_file",
        args: {},
        argsText: "{}",
        result: "Read source",
      },
    },
    {
      id: "commentary-2",
      kind: "commentary",
      label: "Checking the fix",
      part: { type: "text", text: "I found the issue; checking the fix." },
    },
    {
      id: "answer",
      kind: "answer",
      label: "",
      part: { type: "text", text: "The final answer." },
    },
  ],
};

describe("run activity external-store recipe", () => {
  it("preserves the explicit run boundary and part order in the runtime", () => {
    const converted = convertRun(RUN);
    expect(converted.id).toBe(RUN.id);
    expect(converted.content).toEqual(RUN.parts.map((entry) => entry.part));
    expect(converted.status).toEqual(RUN.status);
    expect(converted.metadata?.custom?.activityPresentation).toEqual({
      timing: RUN.timing,
      entries: RUN.parts.map(({ id, kind, label }) => ({ id, kind, label })),
    });
  });

  it("renders persisted duration and keeps the answer outside the runtime disclosure", async () => {
    render(<ActivityRunExample run={RUN} />);
    expect(
      await screen.findByRole("button", { name: "Worked for 2m 13s" }),
    ).toBeTruthy();
    expect(screen.getByText("The final answer.")).toBeTruthy();
    expect(screen.queryByText("I’ll inspect the files.")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Worked for 2m 13s" }));
    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-activity-kind")),
    ).toEqual(["commentary", "tool", "commentary"]);
    expect(screen.getByText("I’ll inspect the files.")).toBeTruthy();
    expect(
      screen.getByText("I found the issue; checking the fix."),
    ).toBeTruthy();
  });

  it.each(["", "\n\n", " \t "])(
    "keeps the answer and activity parts aligned after blank commentary %j",
    async (text) => {
      render(
        <ActivityRunExample
          run={{
            ...RUN,
            parts: [
              RUN.parts[0]!,
              {
                id: "blank-commentary",
                kind: "commentary",
                label: "Pending commentary",
                part: { type: "text", text },
              },
              ...RUN.parts.slice(1),
            ],
          }}
        />,
      );
      expect(await screen.findByText("The final answer.")).toBeTruthy();
      expect(screen.queryByText("I’ll inspect the files.")).toBeNull();
      fireEvent.click(
        screen.getByRole("button", { name: "Worked for 2m 13s" }),
      );
      expect(screen.queryByText("Pending commentary")).toBeNull();
      expect(
        screen
          .getAllByRole("listitem")
          .map((item) => item.getAttribute("data-activity-kind")),
      ).toEqual(["commentary", "tool", "commentary"]);
    },
  );

  it("keeps classification aligned as an empty streaming part gains text", async () => {
    const pending: ActivityRun["parts"][number] = {
      id: "pending-commentary",
      kind: "commentary",
      label: "More context",
      part: { type: "text", text: "\n" },
    };
    const running: ActivityRun = {
      ...RUN,
      status: { type: "running" },
      timing: { startedAt: Date.now() },
      parts: [RUN.parts[0]!, pending, ...RUN.parts.slice(1, 3)],
    };
    const view = render(<ActivityRunExample run={running} />);
    const trigger = await screen.findByRole("button", { name: /Working/ });
    expect(screen.getByText("Checking the fix")).toBeTruthy();
    fireEvent.click(trigger);
    await act(async () =>
      view.rerender(
        <ActivityRunExample
          run={{
            ...RUN,
            parts: [
              RUN.parts[0]!,
              {
                ...pending,
                part: { type: "text", text: "More context arrived." },
              },
              ...RUN.parts.slice(1),
            ],
          }}
        />,
      ),
    );
    expect(screen.getByText("More context arrived.")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Worked for 2m 13s" }));
    expect(screen.queryByText("More context arrived.")).toBeNull();
    expect(screen.getByText("The final answer.")).toBeTruthy();
  });

  it("preserves expansion through a real runtime streaming-to-complete update", async () => {
    const running: ActivityRun = {
      ...RUN,
      status: { type: "running" },
      timing: { startedAt: Date.now() - 12000 },
      parts: RUN.parts.slice(0, 3),
    };
    const view = render(<ActivityRunExample run={running} />);
    const trigger = await screen.findByRole("button", { name: /Working/ });
    fireEvent.click(trigger);
    await act(async () => view.rerender(<ActivityRunExample run={RUN} />));
    expect(
      screen
        .getByRole("button", { name: "Worked for 2m 13s" })
        .getAttribute("aria-expanded"),
    ).toBe("true");
    expect(screen.getByText("The final answer.")).toBeTruthy();
  });

  it("keeps a pending tool approval actionable even when classified as a tool", async () => {
    const onRespondToToolApproval = vi.fn();
    const run: ActivityRun = {
      ...RUN,
      status: { type: "requires-action", reason: "tool-calls" },
      parts: [
        ...RUN.parts.slice(0, 1),
        {
          id: "approval",
          kind: "tool",
          label: "Run tests",
          part: {
            type: "tool-call",
            toolCallId: "approval",
            toolName: "run_command",
            args: {},
            argsText: "{}",
            approval: { id: "approval-1", prompt: "Run the tests?" },
          },
        },
      ],
    };
    render(
      <ActivityRunExample
        run={run}
        onRespondToToolApproval={onRespondToToolApproval}
      />,
    );
    const approve = await screen.findByRole("button", { name: "Allow" });
    expect(
      screen
        .getByRole("button", { name: /Needs your input/ })
        .getAttribute("aria-expanded"),
    ).toBe("false");
    fireEvent.click(approve);
    await waitFor(() => expect(onRespondToToolApproval).toHaveBeenCalledOnce());
    expect(onRespondToToolApproval.mock.calls[0]?.[0]).toMatchObject({
      approvalId: "approval-1",
      approved: true,
    });
  });

  it("keeps automatically approved tools in history through completion", async () => {
    const tool: ToolCallMessagePart = {
      type: "tool-call",
      toolCallId: "automatic",
      toolName: "read_file",
      args: {},
      argsText: "{}",
      approval: { id: "automatic-1", approved: true, isAutomatic: true },
    };
    const run: ActivityRun = {
      ...RUN,
      status: { type: "running" },
      parts: [
        RUN.parts[0]!,
        { id: "automatic", kind: "tool", label: "Reading source", part: tool },
      ],
    };
    const view = render(<ActivityRunExample run={run} />);
    const trigger = await screen.findByRole("button", { name: /Working/ });
    expect(screen.queryByRole("group", { name: "Reading source" })).toBeNull();
    fireEvent.click(trigger);
    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-activity-kind")),
    ).toEqual(["commentary", "tool"]);
    fireEvent.click(trigger);

    await act(async () =>
      view.rerender(
        <ActivityRunExample
          run={{
            ...run,
            status: RUN.status,
            parts: [
              run.parts[0]!,
              {
                ...run.parts[1]!,
                part: { ...tool, result: "Automatic result" },
              },
              RUN.parts[3]!,
            ],
          }}
        />,
      ),
    );
    expect(screen.getByText("The final answer.")).toBeTruthy();
    expect(screen.queryByText("Automatic result")).toBeNull();
    expect(screen.queryByRole("group", { name: "Reading source" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Worked for 2m 13s" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Used tool: read_file" }),
    );
    expect(screen.getByText("Automatic result")).toBeTruthy();
  });

  it.each(["error", "interrupt"] as const)(
    "surfaces an automatically approved tool that later needs attention for an %s",
    async (reason) => {
      render(
        <ActivityRunExample
          run={{
            ...RUN,
            status:
              reason === "error"
                ? RUN.status
                : { type: "requires-action", reason: "interrupt" },
            parts: [
              RUN.parts[0]!,
              {
                id: "automatic",
                kind: "tool",
                label: "Reading source",
                part: {
                  type: "tool-call",
                  toolCallId: "automatic",
                  toolName: "read_file",
                  args: {},
                  argsText: "{}",
                  approval: {
                    id: "automatic-1",
                    approved: true,
                    isAutomatic: true,
                  },
                  ...(reason === "error"
                    ? { result: "Read failed", isError: true }
                    : { interrupt: { type: "human", payload: {} } }),
                },
              },
            ],
          }}
        />,
      );
      expect(
        await screen.findByRole("group", { name: "Reading source" }),
      ).toBeTruthy();
      expect(screen.queryByText("I’ll inspect the files.")).toBeNull();
    },
  );

  it("keeps one history disclosure across a visible decision between activity parts", async () => {
    render(
      <ActivityRunExample
        run={{
          ...RUN,
          status: { type: "requires-action", reason: "tool-calls" },
          parts: [
            RUN.parts[0]!,
            {
              id: "approval",
              kind: "tool",
              label: "Run tests",
              part: {
                type: "tool-call",
                toolCallId: "approval",
                toolName: "run_command",
                args: {},
                argsText: "{}",
                approval: { id: "approval-1", prompt: "Run the tests?" },
              },
            },
            ...RUN.parts.slice(1),
          ],
        }}
        onRespondToToolApproval={vi.fn()}
      />,
    );
    expect(await screen.findByRole("button", { name: "Allow" })).toBeTruthy();
    const summaries = screen.getAllByRole("button", {
      name: /Needs your input/,
    });
    expect(summaries).toHaveLength(1);
    fireEvent.click(summaries[0]!);
    expect(
      screen
        .getAllByRole("listitem")
        .map((item) => item.getAttribute("data-activity-kind")),
    ).toEqual(["commentary", "tool", "commentary"]);
    expect(screen.getByText("The final answer.")).toBeTruthy();
    expect(
      screen.getByRole("group", { name: "Run tests" }).closest("ol"),
    ).toBeNull();
  });

  it("surfaces a status-only tool decision and keeps its result visible after settlement", async () => {
    const tool: ToolCallMessagePart = {
      type: "tool-call",
      toolCallId: "status-only",
      toolName: "run_command",
      args: {},
      argsText: "{}",
    };
    const run: ActivityRun = {
      ...RUN,
      status: { type: "requires-action", reason: "tool-calls" },
      parts: [
        RUN.parts[0]!,
        { id: "status-only", kind: "tool", label: "Run tests", part: tool },
      ],
    };
    const onAddToolResult = vi.fn();
    const view = render(
      <ActivityRunExample run={run} onAddToolResult={onAddToolResult} />,
    );
    const allow = await screen.findByRole("button", { name: "Allow" });
    allow.focus();
    fireEvent.click(allow);
    await waitFor(() => expect(onAddToolResult).toHaveBeenCalledOnce());
    expect(onAddToolResult.mock.calls[0]?.[0]).toMatchObject({
      toolCallId: "status-only",
      result: "Approved by user",
    });
    await act(async () =>
      view.rerender(
        <ActivityRunExample
          run={{
            ...run,
            status: { type: "complete", reason: "stop" },
            parts: [
              run.parts[0]!,
              {
                ...run.parts[1]!,
                part: { ...tool, result: "Recorded tool result" },
              },
            ],
          }}
        />,
      ),
    );
    expect(screen.getByText("Recorded tool result")).toBeTruthy();
    expect(document.activeElement).toBe(
      screen.getByRole("group", { name: "Run tests" }),
    );
  });

  it.each([
    [true, false],
    [false, false],
    [true, true],
  ])(
    "keeps the decision visible with approved=%s and focus elsewhere=%s",
    async (approved, focusElsewhere) => {
      const approvalPart = {
        type: "tool-call" as const,
        toolCallId: "approval",
        toolName: "run_command",
        args: {},
        argsText: "{}",
        approval: { id: "approval-1", prompt: "Run the tests?" },
      };
      const run: ActivityRun = {
        ...RUN,
        status: { type: "requires-action", reason: "tool-calls" },
        parts: [
          RUN.parts[0]!,
          {
            id: "approval",
            kind: "tool",
            label: "Run tests",
            part: approvalPart,
          },
        ],
      };
      const onRespondToToolApproval = vi.fn();
      const example = (value: ActivityRun) => (
        <>
          <ActivityRunExample
            run={value}
            onRespondToToolApproval={onRespondToToolApproval}
          />
          <button type="button">Other action</button>
        </>
      );
      const view = render(example(run));
      const decision = await screen.findByRole("button", {
        name: approved ? "Allow" : "Deny",
      });
      decision.focus();
      fireEvent.click(decision);
      const otherAction = screen.getByRole("button", { name: "Other action" });
      if (focusElsewhere) otherAction.focus();
      await act(async () =>
        view.rerender(
          example({
            ...run,
            status: { type: "complete", reason: "stop" },
            parts: [
              run.parts[0]!,
              {
                ...run.parts[1]!,
                part: {
                  ...approvalPart,
                  approval: { ...approvalPart.approval, approved },
                  result: "Decision recorded",
                },
              },
            ],
          }),
        ),
      );
      expect(screen.getByText("Decision recorded")).toBeTruthy();
      const attention = screen.getByRole("group", { name: "Run tests" });
      expect(document.activeElement).toBe(
        focusElsewhere ? otherAction : attention,
      );
      expect(
        screen
          .getByRole("button", { name: "Worked for 2m 13s" })
          .getAttribute("aria-expanded"),
      ).toBe("false");
    },
  );

  it.each([
    [{ type: "requires-action", reason: "interrupt" }, "requires-action"],
    [{ type: "incomplete", reason: "cancelled" }, "cancelled"],
    [{ type: "incomplete", reason: "error" }, "error"],
    [{ type: "incomplete", reason: "length" }, "incomplete"],
    [{ type: "incomplete", reason: "content-filter" }, "incomplete"],
    [{ type: "incomplete", reason: "tool-calls" }, "incomplete"],
  ] as const)("keeps %j distinct from success", (status, expected) => {
    expect(activityStatus(status)).toBe(expected);
  });

  it("restores the recorded duration after a JSON persistence round trip", async () => {
    render(<ActivityRunExample run={JSON.parse(JSON.stringify(RUN))} />);
    expect(
      await screen.findByRole("button", { name: "Worked for 2m 13s" }),
    ).toBeTruthy();
    expect(screen.getByText("The final answer.")).toBeTruthy();
  });

  it.each([
    [{ type: "complete", reason: "stop" }, "Completed"],
    [{ type: "incomplete", reason: "cancelled" }, "Stopped"],
    [{ type: "incomplete", reason: "error" }, "Failed"],
  ] as const)(
    "uses a complete label for %j without a recorded end time",
    async (status, label) => {
      render(
        <ActivityRunExample
          run={{ ...RUN, status, timing: { startedAt: 1000 } }}
        />,
      );
      expect(await screen.findByRole("button", { name: label })).toBeTruthy();
      expect(screen.getByRole("status").textContent).toBe(label);
      expect(screen.queryByText("2m 13s")).toBeNull();
    },
  );
});
