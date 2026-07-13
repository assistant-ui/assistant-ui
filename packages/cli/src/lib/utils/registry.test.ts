import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  getComponentsJsonStyle,
  resolveQuickStartRegistryUrl,
  resolveRegistryItemUrl,
} from "./registry";

describe("getComponentsJsonStyle", () => {
  let cwd: string;

  beforeEach(() => {
    cwd = fs.mkdtempSync(path.join(os.tmpdir(), "assistant-ui-cli-"));
  });

  afterEach(() => {
    fs.rmSync(cwd, { recursive: true, force: true });
  });

  it("reads the style from components.json", () => {
    fs.writeFileSync(
      path.join(cwd, "components.json"),
      JSON.stringify({ style: "base-nova" }),
    );

    expect(getComponentsJsonStyle(cwd)).toBe("base-nova");
  });

  it("ignores a stale assistant-ui.json", () => {
    fs.writeFileSync(
      path.join(cwd, "assistant-ui.json"),
      JSON.stringify({ style: "new-york" }),
    );
    fs.writeFileSync(
      path.join(cwd, "components.json"),
      JSON.stringify({ style: "base-nova" }),
    );

    expect(getComponentsJsonStyle(cwd)).toBe("base-nova");
  });

  it("falls back when components.json is missing", () => {
    expect(getComponentsJsonStyle(cwd)).toBeUndefined();
  });

  it("falls back when components.json cannot be parsed", () => {
    fs.writeFileSync(path.join(cwd, "components.json"), "{");

    expect(getComponentsJsonStyle(cwd)).toBeUndefined();
  });

  it("falls back when the style is not a string", () => {
    fs.writeFileSync(
      path.join(cwd, "components.json"),
      JSON.stringify({ style: 7 }),
    );

    expect(getComponentsJsonStyle(cwd)).toBeUndefined();
  });
});

describe("resolveQuickStartRegistryUrl", () => {
  it("uses the base quick start for base styles", () => {
    expect(resolveQuickStartRegistryUrl("base-nova")).toBe(
      "https://r.assistant-ui.com/base/chat/b/ai-sdk-quick-start/json",
    );
  });

  it("uses the radix quick start for radix styles", () => {
    expect(resolveQuickStartRegistryUrl("radix-nova")).toBe(
      "https://r.assistant-ui.com/chat/b/ai-sdk-quick-start/json",
    );
  });

  it("uses the base quick start without a style", () => {
    expect(resolveQuickStartRegistryUrl()).toBe(
      "https://r.assistant-ui.com/base/chat/b/ai-sdk-quick-start/json",
    );
  });
});

describe("resolveRegistryItemUrl", () => {
  it("uses the style scoped URL for base styles", () => {
    expect(resolveRegistryItemUrl("thread", "base-nova")).toBe(
      "https://r.assistant-ui.com/styles/base-nova/thread.json",
    );
  });

  it("uses the plain URL for non-base styles", () => {
    expect(resolveRegistryItemUrl("thread", "nova")).toBe(
      "https://r.assistant-ui.com/thread.json",
    );
  });

  it("uses the plain URL without a style", () => {
    expect(resolveRegistryItemUrl("thread")).toBe(
      "https://r.assistant-ui.com/thread.json",
    );
  });

  it("keeps the style inside a single path segment", () => {
    expect(resolveRegistryItemUrl("thread", "base-nova?preview=1")).toBe(
      "https://r.assistant-ui.com/styles/base-nova%3Fpreview%3D1/thread.json",
    );
  });
});
