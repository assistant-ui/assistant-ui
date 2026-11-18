import { describe, expect, it } from "vitest";
import { checkOverlaySrc, isSameOrigin, parseHttpUrl } from "./origins.js";

const REMOTE = "https://r.example/widget/";
const INLINE = "about:srcdoc";

describe("parseHttpUrl", () => {
  it("accepts http(s) URLs, resolving against a base", () => {
    expect(parseHttpUrl("https://r.example/a")?.href).toBe(
      "https://r.example/a",
    );
    expect(parseHttpUrl("/w/", "http://localhost:5173/")?.href).toBe(
      "http://localhost:5173/w/",
    );
  });

  it("rejects other schemes and invalid URLs", () => {
    for (const url of [
      "javascript:alert(document.cookie)",
      " JavaScript:alert(1)",
      "data:text/html,<script>alert(1)</script>",
      "blob:https://r.example/0b0e",
      "about:srcdoc",
      "file:///etc/passwd",
      "not a url",
    ])
      expect(parseHttpUrl(url)).toBeNull();
  });
});

describe("isSameOrigin", () => {
  it("matches same scheme, host and port", () => {
    expect(isSameOrigin("https://r.example/a", "https://r.example:443/b")).toBe(
      true,
    );
    expect(isSameOrigin("https://R.example/a", "https://r.example/")).toBe(
      true,
    );
  });

  it("does not match different scheme, host or port", () => {
    expect(isSameOrigin("http://r.example/", "https://r.example/")).toBe(false);
    expect(isSameOrigin("https://a.r.example/", "https://r.example/")).toBe(
      false,
    );
    expect(isSameOrigin("https://r.example:8443/", "https://r.example/")).toBe(
      false,
    );
  });

  it("never matches an opaque origin, not even itself", () => {
    const opaque = [
      INLINE,
      "javascript:alert(1)",
      "data:text/html,x",
      "null",
      "about:blank",
    ];
    for (const a of opaque) {
      expect(isSameOrigin(a, a)).toBe(false);
      expect(isSameOrigin(a, REMOTE)).toBe(false);
      expect(isSameOrigin(REMOTE, a)).toBe(false);
      for (const b of opaque) expect(isSameOrigin(a, b)).toBe(false);
    }
  });
});

describe("checkOverlaySrc", () => {
  it("allows a same-origin overlay by default", () => {
    expect(
      checkOverlaySrc("https://r.example/menu/", REMOTE, "same-origin"),
    ).toEqual({ ok: true });
  });

  it("refuses a cross-origin overlay by default", () => {
    expect(
      checkOverlaySrc("https://evil.example/", REMOTE, "same-origin"),
    ).toMatchObject({ ok: false });
  });

  it("refuses a javascript: overlay on an html remote", () => {
    expect(
      checkOverlaySrc(
        "javascript:alert(document.cookie)",
        INLINE,
        "same-origin",
      ),
    ).toMatchObject({ ok: false });
  });

  it("refuses data: and other non-http(s) overlays under every policy", () => {
    for (const src of [
      "data:text/html,<script>alert(1)</script>",
      "javascript:alert(1)",
      "blob:https://r.example/0b0e",
      "about:srcdoc",
    ])
      for (const allowed of [
        "same-origin",
        "any",
        ["null", "https://r.example"],
      ] as const)
        for (const remote of [REMOTE, INLINE])
          expect(checkOverlaySrc(src, remote, allowed)).toMatchObject({
            ok: false,
          });
  });

  it("refuses every URL overlay from an html remote under same-origin", () => {
    expect(
      checkOverlaySrc("https://r.example/menu/", INLINE, "same-origin"),
    ).toMatchObject({ ok: false });
  });

  it("allows any http(s) URL under any", () => {
    expect(checkOverlaySrc("https://x.example/", INLINE, "any")).toEqual({
      ok: true,
    });
  });

  it("matches a list by parsed origin, ignoring a null entry", () => {
    const list = ["null", "https://menus.example"];
    expect(checkOverlaySrc("https://menus.example/m/", REMOTE, list)).toEqual({
      ok: true,
    });
    expect(
      checkOverlaySrc("https://menus.example:443/m/", REMOTE, list),
    ).toEqual({ ok: true });
    expect(
      checkOverlaySrc("http://menus.example/m/", REMOTE, list),
    ).toMatchObject({ ok: false });
    expect(checkOverlaySrc("https://r.example/m/", REMOTE, list)).toMatchObject(
      { ok: false },
    );
  });
});
