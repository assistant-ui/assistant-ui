import { describe, expect, it } from "vitest";
import { createCspNonce, createWebviewCsp, renderWebviewHtml } from "./html";

type FakeUri = { path: string };

const CSP_SOURCE = "https://*.vscode-cdn.net";

const webview = {
  cspSource: CSP_SOURCE,
  asWebviewUri: (uri: FakeUri) => ({
    toString: () => `https://file+.vscode-resource.vscode-cdn.net${uri.path}`,
  }),
};

const directives = (csp: string) =>
  new Map(
    csp.split("; ").map((directive) => {
      const [name = "", ...values] = directive.split(" ");
      return [name, values] as const;
    }),
  );

const cspOf = (html: string) => {
  const match = /http-equiv="Content-Security-Policy" content="([^"]*)"/.exec(
    html,
  );
  return (match?.[1] ?? "").replaceAll("&#39;", "'");
};

describe("createWebviewCsp", () => {
  it("builds the strict policy", () => {
    expect(createWebviewCsp(webview, { nonce: "abc123" })).toBe(
      [
        "default-src 'none'",
        "script-src 'nonce-abc123'",
        `style-src ${CSP_SOURCE} 'nonce-abc123'`,
        `img-src ${CSP_SOURCE} blob: data:`,
        `media-src ${CSP_SOURCE} blob: data:`,
        `font-src ${CSP_SOURCE} data:`,
        `connect-src ${CSP_SOURCE}`,
        "frame-src 'none'",
      ].join("; "),
    );
  });

  it("drops the style nonce for 'unsafe-inline' in relaxed mode", () => {
    const csp = directives(
      createWebviewCsp(webview, { nonce: "abc123", csp: "relaxed" }),
    );

    expect(csp.get("style-src")).toEqual([CSP_SOURCE, "'unsafe-inline'"]);
    expect(csp.get("script-src")).toEqual(["'nonce-abc123'"]);
  });

  it("never allows eval and adds 'wasm-unsafe-eval' only on request", () => {
    const strict = createWebviewCsp(webview, { nonce: "n", csp: "relaxed" });
    const wasm = createWebviewCsp(webview, {
      nonce: "n",
      wasmUnsafeEval: true,
    });

    expect(strict).not.toContain("unsafe-eval");
    expect(directives(wasm).get("script-src")).toEqual([
      "'nonce-n'",
      "'wasm-unsafe-eval'",
    ]);
    expect(wasm).not.toContain("'unsafe-eval'");
  });

  it("appends extra script, connect, image, media and frame sources", () => {
    const csp = directives(
      createWebviewCsp(webview, {
        nonce: "n",
        scriptSrc: [CSP_SOURCE],
        connectSrc: ["https://api.example.com", "wss://api.example.com"],
        imgSrc: ["https://icons.duckduckgo.com"],
        mediaSrc: ["https:"],
        frameSrc: ["https://www.youtube.com"],
      }),
    );

    expect(csp.get("script-src")).toEqual(["'nonce-n'", CSP_SOURCE]);
    expect(csp.get("connect-src")).toEqual([
      CSP_SOURCE,
      "https://api.example.com",
      "wss://api.example.com",
    ]);
    expect(csp.get("img-src")).toEqual([
      CSP_SOURCE,
      "blob:",
      "data:",
      "https://icons.duckduckgo.com",
    ]);
    expect(csp.get("media-src")).toEqual([
      CSP_SOURCE,
      "blob:",
      "data:",
      "https:",
    ]);
    expect(csp.get("frame-src")).toEqual(["https://www.youtube.com"]);
  });

  it("accepts VS Code's multi-source cspSource", () => {
    const csp = directives(
      createWebviewCsp(
        { cspSource: "'self'  https://*.vscode-cdn.net" },
        { nonce: "abc" },
      ),
    );
    expect(csp.get("style-src")).toEqual([
      "'self'",
      "https://*.vscode-cdn.net",
      "'nonce-abc'",
    ]);
    expect(csp.get("connect-src")).toEqual([
      "'self'",
      "https://*.vscode-cdn.net",
    ]);
  });

  it("rejects sources and nonces that would inject directives", () => {
    expect(() =>
      createWebviewCsp(webview, {
        nonce: "n",
        connectSrc: ["https://a.example; script-src *"],
      }),
    ).toThrow(/connect-src/);
    expect(() =>
      createWebviewCsp(webview, { nonce: "n", frameSrc: ["'self'"] }),
    ).toThrow(/frame-src/);
    expect(() =>
      createWebviewCsp(
        { cspSource: "https://x; script-src *" },
        { nonce: "n" },
      ),
    ).toThrow(/cspSource/);
    expect(() =>
      createWebviewCsp({ cspSource: "'self' 'unsafe-eval'" }, { nonce: "n" }),
    ).toThrow(/cspSource/);
    expect(() =>
      createWebviewCsp(webview, { nonce: "n' 'unsafe-inline" }),
    ).toThrow(/nonce/);
  });
});

describe("createCspNonce", () => {
  it("returns distinct base64 nonces of 16 random bytes", () => {
    const nonces = new Set(Array.from({ length: 100 }, createCspNonce));

    expect(nonces.size).toBe(100);
    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
    }
  });
});

describe("renderWebviewHtml", () => {
  it("converts resource URIs and puts the nonce on every script", () => {
    const html = renderWebviewHtml(webview, {
      scripts: [{ path: "/dist/vendor.js" }, { path: "/dist/main.js" }],
      styles: [{ path: "/dist/main.css" }],
      nonce: "abc123",
      title: "Chat",
    });

    expect(html.startsWith('<!doctype html>\n<html lang="en">')).toBe(true);
    expect(html).toContain(
      '<link rel="stylesheet" href="https://file+.vscode-resource.vscode-cdn.net/dist/main.css">',
    );
    expect(html).toContain(
      '<script type="module" nonce="abc123" src="https://file+.vscode-resource.vscode-cdn.net/dist/vendor.js"></script>',
    );
    expect(html).toContain(
      '<script type="module" nonce="abc123" src="https://file+.vscode-resource.vscode-cdn.net/dist/main.js"></script>',
    );
    expect(html.match(/<script\b/g)).toHaveLength(2);
    expect(html.match(/<script [^>]*nonce="abc123"/g)).toHaveLength(2);
    expect(html).toContain('<meta property="csp-nonce" nonce="abc123">');
    expect(html).toContain('<div id="root"></div>');
    expect(html).toContain("<title>Chat</title>");
    expect(cspOf(html)).toBe(createWebviewCsp(webview, { nonce: "abc123" }));
  });

  it("generates a fresh nonce per render and uses it throughout", () => {
    const render = () =>
      renderWebviewHtml(webview, { scripts: [{ path: "/a.js" }] });
    const nonceOf = (html: string) =>
      /<meta property="csp-nonce" nonce="([^"]+)">/.exec(html)?.[1];
    const first = render();
    const second = render();
    const nonce = nonceOf(first);

    expect(nonce).toBeDefined();
    expect(nonceOf(second)).not.toBe(nonce);
    expect(first).toContain(`<script type="module" nonce="${nonce}"`);
    expect(directives(cspOf(first)).get("script-src")).toEqual([
      `'nonce-${nonce}'`,
    ]);
  });

  it("passes CSP options through", () => {
    const html = renderWebviewHtml(webview, {
      scripts: [],
      nonce: "n",
      csp: "relaxed",
      connectSrc: ["https://api.example.com"],
    });
    const csp = directives(cspOf(html));

    expect(csp.get("style-src")).toEqual([CSP_SOURCE, "'unsafe-inline'"]);
    expect(csp.get("connect-src")).toEqual([
      CSP_SOURCE,
      "https://api.example.com",
    ]);
  });

  it("sets the surface, attributes, root and script type", () => {
    const html = renderWebviewHtml(webview, {
      scripts: [{ path: "/main.js" }],
      nonce: "n",
      lang: "de",
      surface: "editor",
      rootId: null,
      scriptType: "classic",
      htmlAttributes: { "data-app": "chat" },
      bodyAttributes: { class: "app" },
    });

    expect(html).toContain('<html lang="de" data-app="chat">');
    expect(html).toContain(
      '<body data-aui-vscode-surface="editor" class="app">',
    );
    expect(html).not.toContain('id="root"');
    expect(html).toContain('<script defer nonce="n" src=');
  });

  it("escapes interpolated values", () => {
    const evil = `"><script>alert('x')</script>&`;
    const html = renderWebviewHtml(
      {
        cspSource: CSP_SOURCE,
        asWebviewUri: (uri: string) => ({ toString: () => uri }),
      },
      {
        scripts: [evil],
        styles: [evil],
        nonce: "n",
        title: `</title>${evil}`,
        lang: evil,
        rootId: evil,
        bodyAttributes: { "data-x": evil },
      },
    );
    const escaped =
      "&quot;&gt;&lt;script&gt;alert(&#39;x&#39;)&lt;/script&gt;&amp;";

    expect(html.match(/<script\b/g)).toHaveLength(1);
    expect(html).not.toContain("</title><");
    expect(html).toContain(`<title>&lt;/title&gt;${escaped}</title>`);
    expect(html).toContain(`<html lang="${escaped}">`);
    expect(html).toContain(`<link rel="stylesheet" href="${escaped}">`);
    expect(html).toContain(`<div id="${escaped}"></div>`);
    expect(html).toContain(`<body data-x="${escaped}">`);
    expect(html).toContain(`<script type="module" nonce="n" src="${escaped}">`);
  });

  it("rejects invalid attribute names", () => {
    expect(() =>
      renderWebviewHtml(webview, {
        scripts: [],
        bodyAttributes: { 'x onload="alert(1)"': "" },
      }),
    ).toThrow(/attribute name/);
  });
});
