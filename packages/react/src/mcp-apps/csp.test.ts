import { describe, expect, it } from "vitest";
import { applyMcpAppCsp, buildMcpAppCsp } from "./csp";

describe("MCP App CSP", () => {
  it("uses restrictive defaults when the resource omits CSP metadata", () => {
    expect(buildMcpAppCsp()).toBe(
      "default-src 'none'; " +
        "script-src 'self' 'unsafe-inline'; " +
        "style-src 'self' 'unsafe-inline'; " +
        "connect-src 'none'; " +
        "img-src 'self' data:; " +
        "font-src 'self'; " +
        "media-src 'self' data:; " +
        "frame-src 'none'; " +
        "base-uri 'self'; " +
        "object-src 'none'; " +
        "form-action 'none'",
    );
  });

  it("allows only valid declared origins", () => {
    expect(
      buildMcpAppCsp({
        connectDomains: [
          "https://api.example",
          "wss://events.example:8443",
          "https://api.example; default-src *",
        ],
        resourceDomains: ["https://*.cdn.example", "wss://assets.example"],
        frameDomains: ["https://video.example/path"],
        baseUriDomains: ["https://base.example"],
      }),
    ).toContain(
      "connect-src 'self' https://api.example wss://events.example:8443",
    );
    expect(
      buildMcpAppCsp({
        resourceDomains: ["https://*.cdn.example", "wss://assets.example"],
      }),
    ).toContain("script-src 'self' 'unsafe-inline' https://*.cdn.example");
    expect(
      buildMcpAppCsp({ resourceDomains: ["wss://assets.example"] }),
    ).toContain("script-src 'self' 'unsafe-inline';");
    expect(
      buildMcpAppCsp({ frameDomains: ["https://video.example/path"] }),
    ).toContain("frame-src 'none'");
    expect(
      buildMcpAppCsp({ baseUriDomains: ["https://base.example"] }),
    ).toContain("base-uri https://base.example");
  });

  it("falls back to the restrictive policy for malformed metadata", () => {
    expect(
      buildMcpAppCsp({
        connectDomains: "https://api.example" as unknown as string[],
      }),
    ).toContain("connect-src 'none'");
  });

  it("places the policy after a doctype and before executable content", () => {
    const html =
      '\uFEFF<!-- license --><!doctype html><script src="https://cdn.example/app.js"></script>';
    const secured = applyMcpAppCsp(html);

    expect(
      secured.startsWith("\uFEFF<!-- license --><!doctype html><meta "),
    ).toBe(true);
    expect(secured.indexOf("Content-Security-Policy")).toBeLessThan(
      secured.indexOf("<script"),
    );
  });
});
