import { describe, it, expect } from "vitest";
import { server } from "../../index.js";

function handler(method: string) {
  const handlers = (server as any).server._requestHandlers;
  const h = handlers.get(method);
  if (!h) throw new Error(`No handler for ${method}`);
  return h;
}

async function complete(uri: string, name: string, value: string) {
  return handler("completion/complete")(
    {
      method: "completion/complete",
      params: { ref: { type: "ref/resource", uri }, argument: { name, value } },
    },
    {},
  );
}

describe("resource argument completions", () => {
  it("suggests doc paths matching the partial value", async () => {
    const res = await complete("aui-docs:///{+path}", "path", "api");
    expect(res.completion.values.length).toBeGreaterThan(0);
    expect(
      res.completion.values.every((v: string) =>
        v.toLowerCase().includes("api"),
      ),
    ).toBe(true);
  });

  it("suggests example names matching the partial value", async () => {
    const res = await complete("aui-example:///{+name}", "name", "with");
    expect(res.completion.values.length).toBeGreaterThan(0);
    expect(
      res.completion.values.every((v: string) =>
        v.toLowerCase().includes("with"),
      ),
    ).toBe(true);
  });

  it("returns no values for a nonsense partial", async () => {
    const res = await complete("aui-docs:///{+path}", "path", "zzzqqxnope");
    expect(res.completion.values).toHaveLength(0);
  });
});
