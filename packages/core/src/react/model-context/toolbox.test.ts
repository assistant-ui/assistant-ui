import { describe, expect, it } from "vitest";
import { makeToolCallTextComponent } from "./toolbox";

describe("makeToolCallTextComponent", () => {
  it("renders static running and complete text", () => {
    const Render = makeToolCallTextComponent({
      running: "Searching...",
      complete: "Done searching",
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
        status: { type: "running" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Searching...");

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
        result: "ok",
        status: { type: "complete" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Done searching");
  });

  it("passes args and result to dynamic text functions", () => {
    const Render = makeToolCallTextComponent<
      { query: string },
      { count: number }
    >({
      running: ({ args }) => `Searching ${args.query}...`,
      complete: ({ args, result }) =>
        `Found ${result?.count ?? 0} results for ${args.query}`,
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: { query: "docs" },
        argsText: '{"query":"docs"}',
        status: { type: "running" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Searching docs...");

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: { query: "docs" },
        argsText: '{"query":"docs"}',
        result: { count: 3 },
        status: { type: "complete" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Found 3 results for docs");
  });

  it("treats missing status as complete", () => {
    const Render = makeToolCallTextComponent({
      running: "Running",
      complete: "Complete",
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Complete");
  });

  it("treats incomplete status as a terminal state", () => {
    const Render = makeToolCallTextComponent({
      running: "Searching...",
      complete: "Finished",
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
        status: { type: "incomplete", reason: "error" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Finished");
  });

  it("treats requires-action status as running", () => {
    const Render = makeToolCallTextComponent({
      running: "Waiting for approval...",
      complete: "Done",
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "confirm",
        args: {},
        argsText: "{}",
        status: { type: "requires-action", reason: "interrupt" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBe("Waiting for approval...");
  });

  it("renders null for terminal status when only running text is provided", () => {
    const Render = makeToolCallTextComponent({
      running: "Searching...",
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
        status: { type: "complete" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBeNull();
  });

  it("renders null for running status when only complete text is provided", () => {
    const Render = makeToolCallTextComponent({
      complete: "Done",
    });

    expect(
      Render({
        type: "tool-call",
        toolCallId: "call-1",
        toolName: "search",
        args: {},
        argsText: "{}",
        status: { type: "running" },
        addResult: () => {},
        resume: () => {},
        respondToApproval: () => {},
      }),
    ).toBeNull();
  });
});
