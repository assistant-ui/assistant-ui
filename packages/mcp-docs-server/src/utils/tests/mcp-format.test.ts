import { describe, it, expect } from "vitest";
import { formatMCPResponse } from "../mcp-format.js";

describe("formatMCPResponse", () => {
  it("attaches structuredContent for object data, mirroring the text block", () => {
    const data = { found: true, path: "getting-started", type: "file" };
    const res = formatMCPResponse(data);
    expect(res.content[0]!.text).toBe(JSON.stringify(data, null, 2));
    expect(res.structuredContent).toEqual(data);
  });

  it("omits structuredContent for string data", () => {
    const res = formatMCPResponse("plain text");
    expect(res.content[0]!.text).toBe("plain text");
    expect(res.structuredContent).toBeUndefined();
  });

  it("omits structuredContent for array data", () => {
    const res = formatMCPResponse([1, 2, 3] as any);
    expect(res.structuredContent).toBeUndefined();
  });
});
