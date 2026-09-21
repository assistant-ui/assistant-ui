import { describe, expect, it } from "vitest";
import { resolveProducts } from "./index";
import { buildInstallPrompt } from "./build-install-prompt";

describe("buildInstallPrompt", () => {
  it("numbers each product and links its markdown docs", () => {
    const prompt = buildInstallPrompt(
      resolveProducts(["assistant-ui", "cloud"]),
    );
    expect(prompt).toContain("## 1. assistant-ui");
    expect(prompt).toContain("## 2. Assistant Cloud");
    expect(prompt).toContain(
      "https://www.assistant-ui.com/docs/runtimes/pick-a-runtime.md",
    );
    expect(prompt).toContain("llms.txt");
  });
});
