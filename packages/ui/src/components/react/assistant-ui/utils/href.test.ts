import { describe, expect, it } from "vitest";
import { canPreload, hostOf, safeBackgroundImage, safeHref } from "./href";

describe("safeHref", () => {
  it("keeps http, https, and mailto URLs as given", () => {
    expect(safeHref("https://example.com/a?b=1#c")).toBe(
      "https://example.com/a?b=1#c",
    );
    expect(safeHref("http://example.com")).toBe("http://example.com");
    expect(safeHref("mailto:team@example.com")).toBe("mailto:team@example.com");
  });

  it("keeps URLs relative to the page", () => {
    for (const url of ["/docs", "#top", "?q=1", "./a", "../b", "//cdn.test/x"])
      expect(safeHref(url)).toBe(url);
  });

  it("refuses targets that run script or embed a document", () => {
    for (const url of [
      "javascript:alert(1)",
      "JavaScript:alert(1)",
      " javascript:alert(1)",
      "java\tscript:alert(1)",
      "\u0001javascript:alert(1)",
      "vbscript:msgbox(1)",
      "data:text/html,<script>alert(1)</script>",
      "file:///etc/passwd",
    ])
      expect(safeHref(url)).toBeUndefined();
  });

  it("refuses strings that are not URLs", () => {
    for (const url of [undefined, "", "   ", "example.com", "not a url"])
      expect(safeHref(url)).toBeUndefined();
  });
});

describe("hostOf", () => {
  it("names the host without a leading www", () => {
    expect(hostOf("https://www.example.com/a")).toBe("example.com");
    expect(hostOf("https://docs.example.com")).toBe("docs.example.com");
  });

  it("has no host for relative, mailto, or unsafe URLs", () => {
    expect(hostOf("/docs")).toBeUndefined();
    expect(hostOf("mailto:a@example.com")).toBeUndefined();
    expect(hostOf("javascript:alert(1)")).toBeUndefined();
  });
});

describe("canPreload", () => {
  it("allows local URLs without an allowlist", () => {
    for (const url of [
      "/media/clip.mp4",
      "./thumb.png",
      "thumb.png",
      "?v=1",
      "data:image/png;base64,AAAA",
      "data:audio/mpeg;base64,AAAA",
      "blob:https://app.example/1234",
    ]) {
      expect(canPreload(url, undefined)).toBe(true);
    }
  });

  it("refuses remote and unusual URLs without an allowlist", () => {
    for (const url of [
      "https://tracker.example/pixel.png",
      "http://tracker.example/a.mp3",
      "//tracker.example/a.png",
      "/\\tracker.example/a.png",
      "\\\\tracker.example/a.png",
      "/\t/tracker.example/a.png",
      "\n//tracker.example/a.png",
      "h\tttps:tracker.example/a.png",
      "\u0001https:tracker.example/a.png",
      "data:text/html,<b>x</b>",
      "javascript:alert(1)",
      "ftp://files.example/a.mp3",
      "",
      "   ",
      undefined,
    ]) {
      expect(canPreload(url, undefined)).toBe(false);
    }
  });

  it("allows remote URLs whose origin is listed", () => {
    const origins = ["https://cdn.example"];
    expect(canPreload("https://cdn.example/a.mp4", origins)).toBe(true);
    expect(canPreload("https://cdn.example:8443/a.mp4", origins)).toBe(false);
    expect(canPreload("http://cdn.example/a.mp4", origins)).toBe(false);
    expect(canPreload("https://cdn.example.evil/a.mp4", origins)).toBe(false);
    expect(canPreload("https://other.example/a.mp4", ["not a url"])).toBe(
      false,
    );
  });

  it("allows a scheme-relative URL only when both of its origins are listed", () => {
    expect(canPreload("//cdn.example/a.png", ["https://cdn.example"])).toBe(
      false,
    );
    expect(
      canPreload("//cdn.example/a.png", [
        "http://cdn.example",
        "https://cdn.example",
      ]),
    ).toBe(true);
  });

  it('allows every http and https origin with "*"', () => {
    expect(canPreload("https://any.example/a.png", ["*"])).toBe(true);
    expect(canPreload("//any.example/a.png", ["*"])).toBe(true);
    expect(canPreload("javascript:alert(1)", ["*"])).toBe(false);
  });
});

describe("safeBackgroundImage", () => {
  it("keeps gradients and local images", () => {
    const gradient = "linear-gradient(135deg, #111, #333)";
    expect(safeBackgroundImage(gradient, undefined)).toBe(gradient);
    expect(safeBackgroundImage("url(/diagram-thumb.png)", undefined)).toBe(
      "url(/diagram-thumb.png)",
    );
    expect(
      safeBackgroundImage(`url("data:image/png;base64,AAAA"), ${gradient}`, []),
    ).toBe(`url("data:image/png;base64,AAAA"), ${gradient}`);
  });

  it("drops values that load a remote image", () => {
    for (const value of [
      "url(https://tracker.example/p.png)",
      "url( 'https://tracker.example/p.png' )",
      'linear-gradient(red, blue), url("//tracker.example/p.png")',
      "image-set('https://tracker.example/p.png' 1x)",
      "url(\\68 ttps://tracker.example/p.png)",
      'url("/\t/tracker.example/p.png")',
      "var(--swatch)",
      "linear-gradient(red, var(--c))",
      "src('https://tracker.example/p.png')",
      "url(https://tracker.example/p.png",
      'url("https://tracker.example/p.png)',
      "url('https://tracker.example/p.png)",
      "url(/ok.png), url(https://tracker.example/p.png",
    ]) {
      expect(safeBackgroundImage(value, undefined)).toBeUndefined();
    }
  });

  it("allows listed origins", () => {
    expect(
      safeBackgroundImage("url(https://cdn.example/t.png)", [
        "https://cdn.example",
      ]),
    ).toBe("url(https://cdn.example/t.png)");
  });
});
