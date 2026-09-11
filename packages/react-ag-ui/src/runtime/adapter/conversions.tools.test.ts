import { describe, expect, expectTypeOf, it } from "vitest";
import { ToolSchema, type RunAgentParameters } from "@ag-ui/client";
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

  it("serializes a description-less tool that upstream still accepts", () => {
    const [tool] = toAgUiTools({ undescribed: { parameters: {} } });

    expect(ToolSchema.safeParse(JSON.parse(JSON.stringify(tool))).success).toBe(
      true,
    );
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
