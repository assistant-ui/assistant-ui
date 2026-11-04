import { describe, expect, it } from "vitest";
import {
  connectSrc,
  hasDoctype,
  normalizeHtml,
  streamPrefix,
} from "./index.js";

describe("normalizeHtml", () => {
  it("adds a doctype and the runtime first in <head>", () => {
    const { html, headers } = normalizeHtml(
      "<html><head><title>x</title></head><body>hi</body></html>",
    );
    expect(html.startsWith("<!doctype html>")).toBe(true);
    expect(html).toContain(
      '<head><script src="/rc-runtime.js"></script><title>',
    );
    expect(headers["content-security-policy"]).toBe("connect-src https: wss:");
    expect(headers["allow-csp-from"]).toBe("*");
  });

  it("accepts fragments and pages without <head>", () => {
    expect(normalizeHtml("<p>hi</p>").html).toBe(
      '<!doctype html><script src="/rc-runtime.js"></script>\n<p>hi</p>',
    );
    expect(
      normalizeHtml("<!DOCTYPE html><html><body>x</body></html>").html,
    ).toContain(
      '<html><head><script src="/rc-runtime.js"></script></head><body>',
    );
  });

  it("keeps a runtime tag the page has, and inlines when asked", () => {
    const own =
      '<!doctype html><head><script src="https://cdn.example/rc-runtime.js"></script></head>';
    expect(normalizeHtml(own).html).toBe(own);
    const inl = normalizeHtml("<p>x</p>", {
      runtime: { inline: "var a='</script>'" },
    }).html;
    expect(inl).toContain(
      "<script data-rc-runtime>var a='<\\/script>'</script>",
    );
  });

  it("puts the CSP in a meta tag for header-less documents", () => {
    const { html } = normalizeHtml("<p>x</p>", {
      cspMeta: true,
      network: "none",
    });
    expect(html).toContain(
      `<meta http-equiv="Content-Security-Policy" content="connect-src 'none'">`,
    );
  });

  it("detects doctypes after comments", () => {
    expect(hasDoctype("<!-- hi -->\n<!DOCTYPE html>")).toBe(true);
    expect(hasDoctype("<code><!doctype html>")).toBe(false);
  });

  it("streams with the runtime first", () => {
    expect(streamPrefix()).toBe(
      '<!doctype html>\n<script src="/rc-runtime.js"></script>',
    );
  });
});

describe("network policy", () => {
  it("public by default; none or a host list lock it down", () => {
    expect(connectSrc()).toBe("https: wss:");
    expect(connectSrc("none")).toBe("'none'");
    expect(connectSrc(["https://a.example", "https://b.example"])).toBe(
      "https://a.example https://b.example",
    );
    expect(connectSrc(["javascript:alert(1)"])).toBe("'none'");
  });

  it("leaves a page's own CSP meta alone (the browser enforces both)", () => {
    const page = `<!doctype html><head><meta http-equiv="Content-Security-Policy" content="connect-src https://api.example.com"></head>`;
    const { html, headers } = normalizeHtml(page);
    expect(html).toContain('content="connect-src https://api.example.com"');
    expect(headers["content-security-policy"]).toBe("connect-src https: wss:");
  });
});

describe("frame-ancestors", () => {
  it("sets which host pages may embed the page", () => {
    expect(
      normalizeHtml("<p>x</p>", { frameAncestors: ["https://app.example"] })
        .headers["content-security-policy"],
    ).toBe("connect-src https: wss:; frame-ancestors https://app.example");
    expect(
      normalizeHtml("<p>x</p>", { frameAncestors: [] }).headers[
        "content-security-policy"
      ],
    ).toBe("connect-src https: wss:; frame-ancestors 'none'");
  });
});
