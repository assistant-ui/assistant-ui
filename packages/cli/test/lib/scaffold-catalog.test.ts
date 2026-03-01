import { describe, expect, it } from "vitest";
import {
  isExampleName,
  isTemplateName,
  resolveExampleSourceSpecifier,
  resolveTemplateSourceUrl,
  templateNames,
} from "../../src/lib/scaffold-catalog";

describe("scaffold catalog", () => {
  it("keeps template names in the catalog", () => {
    expect(templateNames).toContain("default");
    expect(templateNames).toContain("cloud-clerk");
  });

  it("resolves template sources to latest starter repositories", () => {
    expect(resolveTemplateSourceUrl("default")).toBe(
      "https://github.com/assistant-ui/assistant-ui-starter",
    );
    expect(resolveTemplateSourceUrl("cloud")).toBe(
      "https://github.com/assistant-ui/assistant-ui-starter-cloud",
    );
  });

  it("resolves example sources to latest monorepo paths", () => {
    expect(resolveExampleSourceSpecifier("with-langgraph")).toBe(
      "assistant-ui/assistant-ui/examples/with-langgraph",
    );
  });

  it("narrows scaffold names with type guards", () => {
    expect(isTemplateName("cloud")).toBe(true);
    expect(isTemplateName("unknown-template")).toBe(false);
    expect(isExampleName("with-react-router")).toBe(true);
    expect(isExampleName("unknown-example")).toBe(false);
  });
});
