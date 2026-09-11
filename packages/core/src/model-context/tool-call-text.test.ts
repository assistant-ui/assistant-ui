import { describe, expect, it } from "vitest";
import { resolveToolCallText } from "./tool-call-text";

describe("resolveToolCallText", () => {
  it("resolves literal text for running and complete tool calls", () => {
    const text = {
      running: "Searching...",
      complete: "Done searching",
    };

    expect(
      resolveToolCallText(text, {
        args: {},
        status: { type: "running" },
      }),
    ).toBe("Searching...");
    expect(
      resolveToolCallText(text, {
        args: {},
        status: { type: "complete" },
      }),
    ).toBe("Done searching");
  });

  it("passes args and results to text functions", () => {
    const text = {
      running: ({ args }: { args: { query: string } }) =>
        `Searching ${args.query}...`,
      complete: ({
        args,
        result,
      }: {
        args: { query: string };
        result: number | undefined;
      }) => `Found ${result ?? 0} results for ${args.query}`,
    };

    expect(
      resolveToolCallText(text, {
        args: { query: "docs" },
        status: { type: "requires-action" },
      }),
    ).toBe("Searching docs...");
    expect(
      resolveToolCallText(text, {
        args: { query: "docs" },
        result: 3,
        status: { type: "complete" },
      }),
    ).toBe("Found 3 results for docs");
  });

  it("returns null when the active status has no text", () => {
    expect(
      resolveToolCallText(
        { running: "Searching..." },
        { args: {}, status: { type: "complete" } },
      ),
    ).toBeNull();
    expect(
      resolveToolCallText(
        { complete: "Done searching" },
        { args: {}, status: { type: "running" } },
      ),
    ).toBeNull();
  });
});
