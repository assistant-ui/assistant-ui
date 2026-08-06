import { describe, expect, expectTypeOf, it } from "vitest";
import type { RunAgentParameters } from "@ag-ui/client";
import { toAgUiTools } from "./conversions";

describe("toAgUiTools", () => {
  it("normalizes a missing description to an empty string", () => {
    const tools = toAgUiTools({
      described: { description: "Has one", parameters: { type: "object" } },
      undescribed: { parameters: { type: "object" } },
    });

    expect(tools).toEqual([
      {
        name: "described",
        description: "Has one",
        parameters: { type: "object" },
      },
      { name: "undescribed", description: "", parameters: { type: "object" } },
    ]);
  });

  it("produces tools the upstream run parameters accept", () => {
    const tools = toAgUiTools({
      search: { description: "Search", parameters: { type: "object" } },
    });

    expectTypeOf(tools).toExtend<NonNullable<RunAgentParameters["tools"]>>();

    const parameters: RunAgentParameters = { runId: "run-1", tools };
    expect(parameters.tools).toHaveLength(1);
  });
});
