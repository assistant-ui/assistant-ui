import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { getComponentsJsonStyle, resolveRegistryItemUrl } from "./registry";

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
});

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

  it("falls back when components.json is missing", () => {
    expect(getComponentsJsonStyle(cwd)).toBeUndefined();
  });

  it("falls back when components.json cannot be read", () => {
    fs.mkdirSync(path.join(cwd, "components.json"));

    expect(getComponentsJsonStyle(cwd)).toBeUndefined();
  });

  it("falls back when components.json cannot be parsed", () => {
    fs.writeFileSync(path.join(cwd, "components.json"), "{");

    expect(getComponentsJsonStyle(cwd)).toBeUndefined();
  });
});
