import { describe, it, expect } from "vitest";
import { server } from "../../index.js";

function handler(method: string) {
  const handlers = (server as any).server._requestHandlers;
  const h = handlers.get(method);
  if (!h) throw new Error(`No handler for ${method}`);
  return h;
}

describe("MCP resources", () => {
  it("lists docs and example resources", async () => {
    const result = await handler("resources/list")(
      { method: "resources/list", params: {} },
      {},
    );
    expect(result.resources.length).toBeGreaterThan(0);
    expect(
      result.resources.some((r: any) => r.uri.startsWith("aui-docs:///")),
    ).toBe(true);
    expect(
      result.resources.some((r: any) => r.uri.startsWith("aui-example:///")),
    ).toBe(true);
  });

  it("reads a documentation resource as markdown", async () => {
    const list = await handler("resources/list")(
      { method: "resources/list", params: {} },
      {},
    );
    const doc = list.resources.find((r: any) =>
      r.uri.startsWith("aui-docs:///"),
    );
    const read = await handler("resources/read")(
      { method: "resources/read", params: { uri: doc.uri } },
      {},
    );
    expect(read.contents[0].mimeType).toBe("text/markdown");
    expect(typeof read.contents[0].text).toBe("string");
    expect(read.contents[0].text.length).toBeGreaterThan(0);
  });

  it("reads a slash-containing documentation resource", async () => {
    const list = await handler("resources/list")(
      { method: "resources/list", params: {} },
      {},
    );
    const prefix = "aui-docs:///";
    const nested = list.resources.find(
      (r: any) =>
        r.uri.startsWith(prefix) && r.uri.slice(prefix.length).includes("/"),
    );
    expect(nested).toBeDefined();
    const read = await handler("resources/read")(
      { method: "resources/read", params: { uri: nested.uri } },
      {},
    );
    expect(read.contents[0].mimeType).toBe("text/markdown");
    expect(read.contents[0].text.length).toBeGreaterThan(0);
  });

  it("errors on an unknown documentation resource", async () => {
    await expect(
      handler("resources/read")(
        {
          method: "resources/read",
          params: { uri: "aui-docs:///definitely-not-a-real-doc" },
        },
        {},
      ),
    ).rejects.toThrow();
  });

  it("reads an example resource as markdown", async () => {
    const list = await handler("resources/list")(
      { method: "resources/list", params: {} },
      {},
    );
    const example = list.resources.find((r: any) =>
      r.uri.startsWith("aui-example:///"),
    );
    const read = await handler("resources/read")(
      { method: "resources/read", params: { uri: example.uri } },
      {},
    );
    expect(read.contents[0].mimeType).toBe("text/markdown");
    expect(typeof read.contents[0].text).toBe("string");
    expect(read.contents[0].text.length).toBeGreaterThan(0);
  });

  it("errors on an unknown example resource", async () => {
    await expect(
      handler("resources/read")(
        {
          method: "resources/read",
          params: { uri: "aui-example:///definitely-not-a-real-example" },
        },
        {},
      ),
    ).rejects.toThrow();
  });
});
