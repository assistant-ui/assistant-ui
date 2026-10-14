import { describe, expect, it } from "vitest";
import { buildBootstrapHtml, themeContext } from "./bootstrap";
import { buildCsp, DEFAULT_CDN_ORIGINS } from "./csp";
import { DEFAULT_DARK_TOKENS } from "./theme";

const directives = (csp: string) =>
  Object.fromEntries(
    csp.split("; ").map((part) => {
      const [name, ...values] = part.split(" ");
      return [name, values];
    }),
  ) as Record<string, string[]>;

describe("buildCsp", () => {
  it("blocks network access and allows the default CDNs for resources", () => {
    const d = directives(buildCsp());
    expect(d["default-src"]).toEqual(["'none'"]);
    expect(d["connect-src"]).toEqual(["'none'"]);
    expect(d["form-action"]).toEqual(["'none'"]);
    expect(d["frame-src"]).toEqual(["'none'"]);
    expect(d["object-src"]).toEqual(["'none'"]);
    expect(d["script-src"]).toEqual([
      "'unsafe-inline'",
      ...DEFAULT_CDN_ORIGINS,
    ]);
    expect(d["img-src"]).toEqual(
      expect.arrayContaining(["data:", "blob:", ...DEFAULT_CDN_ORIGINS]),
    );
    expect(d["font-src"]).toEqual(["data:", ...DEFAULT_CDN_ORIGINS]);
    expect(d["style-src"]).toEqual(["'unsafe-inline'", ...DEFAULT_CDN_ORIGINS]);
    expect(d["script-src"]).not.toContain("'unsafe-eval'");
  });

  it("blocks external styles and fonts when the CDN allowlist is empty", () => {
    const d = directives(buildCsp({ cdnOrigins: [] }));
    expect(d["script-src"]).toEqual(["'unsafe-inline'"]);
    expect(d["style-src"]).toEqual(["'unsafe-inline'"]);
    expect(d["font-src"]).toEqual(["data:"]);
    expect(d["img-src"]).toEqual(["data:", "blob:"]);
    expect(d["media-src"]).toEqual(["data:", "blob:"]);
    expect(d["connect-src"]).toEqual(["'none'"]);
    expect(d["frame-src"]).toEqual(["'none'"]);
  });

  it("adds font origins only to their resource directives", () => {
    const d = directives(
      buildCsp({
        cdnOrigins: [],
        fontStyleOrigins: ["https://fonts.googleapis.com"],
        fontOrigins: ["https://fonts.gstatic.com"],
      }),
    );
    expect(d["style-src"]).toEqual([
      "'unsafe-inline'",
      "https://fonts.googleapis.com",
    ]);
    expect(d["font-src"]).toEqual(["data:", "https://fonts.gstatic.com"]);
    for (const name of [
      "script-src",
      "img-src",
      "media-src",
      "connect-src",
      "frame-src",
    ]) {
      expect(d[name]).not.toContain("https://fonts.googleapis.com");
      expect(d[name]).not.toContain("https://fonts.gstatic.com");
    }
  });

  it("keeps stylesheet and font opt-ins independent", () => {
    expect(
      directives(
        buildCsp({
          cdnOrigins: [],
          fontStyleOrigins: ["https://fonts.googleapis.com"],
        }),
      )["font-src"],
    ).toEqual(["data:"]);
    expect(
      directives(
        buildCsp({
          cdnOrigins: [],
          fontOrigins: ["https://fonts.gstatic.com"],
        }),
      )["style-src"],
    ).toEqual(["'unsafe-inline'"]);
  });

  it("filters and deduplicates font origins like other resource origins", () => {
    const values = [
      "https://fonts.example.com",
      "https://fonts.example.com",
      "https://evil.com; script-src *",
      "javascript:alert(1)",
      "wss://fonts.example.com",
      "https://user:pass@fonts.example.com",
      "https://fonts.example.com?x=1",
    ];
    const d = directives(
      buildCsp({
        cdnOrigins: [],
        fontStyleOrigins: values,
        fontOrigins: values,
      }),
    );
    expect(d["style-src"]).toEqual([
      "'unsafe-inline'",
      "https://fonts.example.com",
    ]);
    expect(d["font-src"]).toEqual(["data:", "https://fonts.example.com"]);
  });

  it("applies configured origins and drops unsafe source expressions", () => {
    const d = directives(
      buildCsp({
        cdnOrigins: [
          "https://cdn.example.com",
          "https://evil.com; script-src *",
          "javascript:alert(1)",
          "https://cdn.example.com",
        ],
        connectOrigins: [
          "https://api.example.com",
          "wss://live.example.com",
          "http://a b",
        ],
        frameOrigins: ["https://www.youtube.com"],
        imageOrigins: ["https://*.images.example.com"],
        allowEval: true,
      }),
    );
    expect(d["script-src"]).toEqual([
      "'unsafe-inline'",
      "'unsafe-eval'",
      "https://cdn.example.com",
    ]);
    expect(d["connect-src"]).toEqual([
      "https://api.example.com",
      "wss://live.example.com",
    ]);
    expect(d["frame-src"]).toEqual(["https://www.youtube.com"]);
    expect(d["img-src"]).toContain("https://*.images.example.com");
  });
});

describe("buildBootstrapHtml", () => {
  it("declares the color scheme and a transparent canvas on the first tag", () => {
    const html = buildBootstrapHtml({
      hostOrigin: "https://app.test",
      tokens: DEFAULT_DARK_TOKENS,
      runtime: "",
    });
    expect(html).toMatch(
      /<html [^>]*style="color-scheme:dark;background:transparent"/,
    );
  });

  const html = buildBootstrapHtml({
    hostOrigin: "https://app.example.com",
    tokens: DEFAULT_DARK_TOKENS,
    runtime: "window.__booted = '</script>';",
  });
  const doc = new DOMParser().parseFromString(html, "text/html");

  it("puts the CSP meta before any script or style", () => {
    const meta = html.indexOf('http-equiv="Content-Security-Policy"');
    expect(meta).toBeGreaterThan(-1);
    expect(meta).toBeLessThan(html.indexOf("<style"));
    expect(meta).toBeLessThan(html.indexOf("<script"));
    expect(
      doc
        .querySelector('meta[http-equiv="Content-Security-Policy"]')!
        .getAttribute("content"),
    ).toBe(buildCsp());
  });

  it("runs the runtime after the root element exists", () => {
    const scripts = Array.from(doc.querySelectorAll("script"));
    const root = doc.getElementById("gf-root")!;
    expect(root.parentElement).toBe(doc.body);
    for (const script of scripts) {
      expect(
        root.compareDocumentPosition(script) & Node.DOCUMENT_POSITION_FOLLOWING,
      ).toBeTruthy();
    }
  });

  it("escapes a closing script tag inside the runtime", () => {
    const runtime = Array.from(doc.querySelectorAll("script")).find(
      (s) => !s.id,
    )!;
    expect(runtime.textContent).toBe("window.__booted = '<\\/script>';");
  });

  it("embeds the host origin as config", () => {
    const config = JSON.parse(doc.getElementById("gf-config")!.textContent!);
    expect(config).toEqual({
      hostOrigin: "https://app.example.com",
      animate: true,
    });
  });

  it("applies the theme on :root before the runtime connects", () => {
    expect(doc.documentElement.dataset["theme"]).toBe("dark");
    const css = doc.getElementById("gf-base")!.textContent!;
    expect(css).toContain(
      `--color-text:${DEFAULT_DARK_TOKENS.variables["--color-text"]};`,
    );
    expect(css).toContain(
      `--color-text-primary:${DEFAULT_DARK_TOKENS.variables["--color-text"]};`,
    );
  });

  it("drops token values that could break out of the declaration block", () => {
    const out = buildBootstrapHtml({
      hostOrigin: "https://a.dev",
      runtime: "",
      tokens: {
        colorScheme: "light",
        variables: {
          "--ok": "red",
          "--bad": "red}body{display:none",
          "bad name": "x",
        },
      },
    });
    expect(out).toContain("--ok:red;");
    expect(out).not.toContain("display:none");
    expect(out).not.toContain("bad name");
  });

  it("embeds the empty external allowlist before inline bootstrap resources", () => {
    const out = buildBootstrapHtml({
      hostOrigin: "https://app.test",
      runtime: "",
      csp: { cdnOrigins: [] },
    });
    const parsed = new DOMParser().parseFromString(out, "text/html");
    const policy = parsed
      .querySelector('meta[http-equiv="Content-Security-Policy"]')!
      .getAttribute("content")!;
    expect(policy).toBe(buildCsp({ cdnOrigins: [] }));
    expect(directives(policy)["style-src"]).toEqual(["'unsafe-inline'"]);
    expect(directives(policy)["font-src"]).toEqual(["data:"]);
    expect(out.indexOf('http-equiv="Content-Security-Policy"')).toBeLessThan(
      out.indexOf("<style"),
    );
  });

  it("accepts a CSP string verbatim", () => {
    const out = buildBootstrapHtml({
      hostOrigin: "https://a.dev",
      runtime: "",
      csp: "default-src 'none'",
    });
    expect(out).toContain(`content="default-src 'none'"`);
  });
});

describe("themeContext", () => {
  it("carries the scheme and both variable sets", () => {
    const context = themeContext(DEFAULT_DARK_TOKENS);
    expect(context.theme).toBe("dark");
    expect(context.styles?.variables?.["--color-accent"]).toBe(
      DEFAULT_DARK_TOKENS.variables["--color-accent"],
    );
    expect(context.styles?.variables?.["--color-ring-primary"]).toBe(
      DEFAULT_DARK_TOKENS.variables["--color-accent"],
    );
  });
});
