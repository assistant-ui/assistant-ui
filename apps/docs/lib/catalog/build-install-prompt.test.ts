import { describe, expect, it } from "vitest";
import { CATALOG_ITEMS, resolveProducts } from "./index";
import { buildInstallPrompt } from "./build-install-prompt";

describe("buildInstallPrompt", () => {
  it("explores named products and prerequisites without the retired product or app-setting prompts", () => {
    const prompt = buildInstallPrompt(CATALOG_ITEMS);
    expect(prompt).toContain("starting goals");
    expect(prompt).toContain("dependency order");
    expect(prompt).toContain("catalog.md");
    expect(prompt).not.toMatch(/ask[^\n]*--product/);
    expect(prompt).not.toMatch(/ask[^\n]*--preset project/);
    expect(prompt).not.toContain("Install the products in the order listed");
    expect(prompt).toContain("selected entryPoint answer");
    expect(prompt).not.toContain("on the page the app opens with");
    expect(prompt).toContain("use h-full inside a sized modal or sidebar");
    expect(prompt).not.toContain('className="h-dvh"');
  });

  it("mounts the Expo thread at the selected entry point instead of a web root component", () => {
    const prompt = buildInstallPrompt(resolveProducts(["assistant-ui"]));
    expect(prompt).toContain(
      "On web, use <Assistant /> for the AI SDK and Mastra or <MyAssistant /> for LangGraph",
    );
    expect(prompt).toContain(
      "On Expo, mount <Thread /> inside its AssistantRuntimeProvider at the selected location",
    );
  });

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

  it("reads as an install guide, without the shop's wording", () => {
    const prompt = buildInstallPrompt(CATALOG_ITEMS);
    expect(prompt).not.toMatch(/\b(?:cart|shop|checkout)\b/i);
  });
});
