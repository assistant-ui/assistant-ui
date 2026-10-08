// @vitest-environment jsdom

import { describe, expect, it } from "vitest";
import { applyMcpAppCsp, buildMcpAppCsp } from "./csp";

const getPolicyMeta = (html: string) =>
  new DOMParser()
    .parseFromString(applyMcpAppCsp(html), "text/html")
    .head.querySelector('meta[http-equiv="Content-Security-Policy"]');

const expectPolicyBeforeScript = (html: string) => {
  const policyIndex = html.indexOf("Content-Security-Policy");
  const scriptIndex = html.indexOf("<script");
  expect(policyIndex).toBeGreaterThanOrEqual(0);
  expect(scriptIndex).toBeGreaterThanOrEqual(0);
  expect(policyIndex).toBeLessThan(scriptIndex);
};

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
    const policy = buildMcpAppCsp({
      connectDomains: [
        "https://api.example",
        "wss://events.example:8443",
        "https://api.example; default-src *",
      ],
      resourceDomains: ["https://*.cdn.example", "wss://assets.example"],
      frameDomains: ["https://video.example/path"],
      baseUriDomains: ["https://base.example"],
    });

    expect(policy.split("; ")).toContain(
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

    expect(secured.startsWith("<!-- license --><!doctype html><meta ")).toBe(
      true,
    );
    expectPolicyBeforeScript(secured);
  });

  it.each([
    "<!--><script>run()</script>-->",
    "<!---><script>run()</script>",
    "<!-- license --!><script>run()</script>",
  ])("places the policy before scripts after HTML comment closers", (html) => {
    expectPolicyBeforeScript(applyMcpAppCsp(html));
  });

  it.each([
    '<?xml version="1.0"?><!doctype html><script>run()</script>',
    "<!foo><!doctype html><script>run()</script>",
  ])("preserves standards mode after leading bogus comments", (html) => {
    const secured = applyMcpAppCsp(html);
    const document = new DOMParser().parseFromString(secured, "text/html");

    expect(secured.indexOf("<!doctype html><meta ")).toBeGreaterThan(0);
    expect(document.compatMode).toBe("CSS1Compat");
    expectPolicyBeforeScript(secured);
  });

  it.each([
    "\u00a0<script>run()</script>",
    "\uFEFF\uFEFF<script>run()</script>",
  ])("keeps the policy in head before non-HTML whitespace", (html) => {
    expect(getPolicyMeta(html)).not.toBeNull();
  });
});
