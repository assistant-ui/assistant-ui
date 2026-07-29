import { describe, it, expect } from "vitest";
import { server } from "../../index.js";
import { McpServer } from "@modelcontextprotocol/server";
import { docsTools } from "../docs.js";
import { examplesTools } from "../examples.js";

describe("MCP Server Integration", () => {
  it("should be an instance of McpServer", () => {
    expect(server).toBeInstanceOf(McpServer);
  });

  it("should have tools with correct properties", () => {
    expect(docsTools.name).toBe("assistantUIDocs");
    expect(docsTools.description).toContain(
      "Retrieve assistant-ui documentation",
    );
    expect(docsTools.parameters).toBeDefined();
    expect(docsTools.execute).toBeInstanceOf(Function);

    expect(examplesTools.name).toBe("assistantUIExamples");
    expect(examplesTools.description).toContain("List available examples");
    expect(examplesTools.parameters).toBeDefined();
    expect(examplesTools.execute).toBeInstanceOf(Function);
  });

  it("should have valid input schemas", () => {
    expect(docsTools.parameters).toBeDefined();
    expect(docsTools.parameters.shape.paths).toBeDefined();

    expect(examplesTools.parameters).toBeDefined();
    expect(examplesTools.parameters.shape.example).toBeDefined();
  });

  it("should execute tools successfully", async () => {
    const docsResult = await docsTools.execute({ paths: ["/"] });
    expect(docsResult).toBeDefined();
    expect(docsResult.content).toBeDefined();
    expect(docsResult.content[0]!.type).toBe("text");

    const examplesResult = await examplesTools.execute({});
    expect(examplesResult).toBeDefined();
    expect(examplesResult.content).toBeDefined();
    expect(examplesResult.content[0]!.type).toBe("text");
  });
});
