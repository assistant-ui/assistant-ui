import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "../../index.js";
import { createMcpTestClient, type McpTestClient } from "./mcp-test-client.js";

type CompletionResult = {
  completion: {
    values: string[];
  };
};

describe("resource argument completions", () => {
  let client: McpTestClient;

  beforeEach(async () => {
    client = await createMcpTestClient(server);
    await client.initialize();
  });

  afterEach(async () => {
    await client?.close();
  });

  async function complete(uri: string, name: string, value: string) {
    return client.request<CompletionResult>({
      method: "completion/complete",
      params: {
        ref: { type: "ref/resource", uri },
        argument: { name, value },
      },
    });
  }

  it("suggests doc paths matching the partial value", async () => {
    const result = await complete("aui-docs:///{+path}", "path", "api");

    expect(result.completion.values.length).toBeGreaterThan(0);
    expect(
      result.completion.values.every((value) =>
        value.toLowerCase().includes("api"),
      ),
    ).toBe(true);
  });

  it("suggests example names matching the partial value", async () => {
    const result = await complete("aui-example:///{+name}", "name", "with");

    expect(result.completion.values.length).toBeGreaterThan(0);
    expect(
      result.completion.values.every((value) =>
        value.toLowerCase().includes("with"),
      ),
    ).toBe(true);
  });

  it("returns no values for a nonsense partial", async () => {
    const result = await complete("aui-docs:///{+path}", "path", "zzzqqxnope");

    expect(result.completion.values).toHaveLength(0);
  });
});
