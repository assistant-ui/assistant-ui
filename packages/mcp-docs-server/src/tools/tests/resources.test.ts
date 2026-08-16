import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { server } from "../../index.js";
import { createMcpTestClient, type McpTestClient } from "./mcp-test-client.js";

type Resource = {
  uri: string;
};

type ResourceListResult = {
  resources: Resource[];
};

type ResourceReadResult = {
  contents: Array<{
    mimeType?: string;
    text?: string;
  }>;
};

function requireResource(resources: Resource[], prefix: string): Resource {
  const resource = resources.find((candidate) =>
    candidate.uri.startsWith(prefix),
  );
  expect(resource).toBeDefined();
  if (!resource) throw new Error(`Missing resource with URI prefix: ${prefix}`);
  return resource;
}

describe("MCP resources", () => {
  let client: McpTestClient;

  beforeEach(async () => {
    client = await createMcpTestClient(server);
    await client.initialize();
  });

  afterEach(async () => {
    await client?.close();
  });

  it("lists docs and example resources", async () => {
    const result = await client.request<ResourceListResult>({
      method: "resources/list",
      params: {},
    });

    expect(result.resources.length).toBeGreaterThan(0);
    expect(
      result.resources.some((resource) =>
        resource.uri.startsWith("aui-docs:///"),
      ),
    ).toBe(true);
    expect(
      result.resources.some((resource) =>
        resource.uri.startsWith("aui-example:///"),
      ),
    ).toBe(true);
  });

  it("reads a documentation resource as markdown", async () => {
    const list = await client.request<ResourceListResult>({
      method: "resources/list",
      params: {},
    });
    const doc = requireResource(list.resources, "aui-docs:///");
    const read = await client.request<ResourceReadResult>({
      method: "resources/read",
      params: { uri: doc.uri },
    });

    expect(read.contents[0]?.mimeType).toBe("text/markdown");
    expect(typeof read.contents[0]?.text).toBe("string");
    expect(read.contents[0]?.text.length).toBeGreaterThan(0);
  });

  it("reads a slash-containing documentation resource", async () => {
    const list = await client.request<ResourceListResult>({
      method: "resources/list",
      params: {},
    });
    const prefix = "aui-docs:///";
    const nested = list.resources.find(
      (resource) =>
        resource.uri.startsWith(prefix) &&
        resource.uri.slice(prefix.length).includes("/"),
    );

    expect(nested).toBeDefined();
    if (!nested) throw new Error("Missing nested documentation resource");

    const read = await client.request<ResourceReadResult>({
      method: "resources/read",
      params: { uri: nested.uri },
    });

    expect(read.contents[0]?.mimeType).toBe("text/markdown");
    expect(read.contents[0]?.text.length).toBeGreaterThan(0);
  });

  it("errors on an unknown documentation resource", async () => {
    await expect(
      client.request({
        method: "resources/read",
        params: { uri: "aui-docs:///definitely-not-a-real-doc" },
      }),
    ).rejects.toThrow();
  });

  it("reads an example resource as markdown", async () => {
    const list = await client.request<ResourceListResult>({
      method: "resources/list",
      params: {},
    });
    const example = requireResource(list.resources, "aui-example:///");
    const read = await client.request<ResourceReadResult>({
      method: "resources/read",
      params: { uri: example.uri },
    });

    expect(read.contents[0]?.mimeType).toBe("text/markdown");
    expect(typeof read.contents[0]?.text).toBe("string");
    expect(read.contents[0]?.text.length).toBeGreaterThan(0);
  });

  it("errors on an unknown example resource", async () => {
    await expect(
      client.request({
        method: "resources/read",
        params: { uri: "aui-example:///definitely-not-a-real-example" },
      }),
    ).rejects.toThrow();
  });
});
