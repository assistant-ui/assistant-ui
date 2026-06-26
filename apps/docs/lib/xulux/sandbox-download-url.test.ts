import { expect, it } from "vitest";
import { resolveSandboxDownloadUrl } from "./sandbox-download-url";
import type { XuluxTemplate } from "@/components/xulux/templates/types";

const template: XuluxTemplate = {
  id: "webpage-assistant-product-docs",
  templateId: "webpage-assistant",
  versionId: "product-docs",
  title: "Product Docs Assistant",
  description: "A docs assistant.",
  categoryId: "docs",
  categoryName: "Docs",
  tags: [],
  prompt: "Open it.",
  gradient: "",
  kind: "template",
  previewStatus: "live",
  sandboxBaseUrl: "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run",
  tech: {
    framework: "Next.js",
    runtime: "assistant-ui + AI SDK",
    frontendPattern: "Docs assistant",
  },
  env: [],
  canStart: true,
};

it("builds a download URL from a catalog sandbox host", () => {
  const url = resolveSandboxDownloadUrl({
    templates: [template],
    templateId: "webpage-assistant",
    versionId: "product-docs",
    downloadSearch: undefined,
  });

  expect(url?.href).toBe(
    "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run/api/download?v=product-docs",
  );
});

it("preserves query parameters from a matching sandbox download URL", () => {
  const url = resolveSandboxDownloadUrl({
    templates: [template],
    templateId: "webpage-assistant",
    versionId: "product-docs",
    downloadSearch: "?session=abc&v=custom",
  });

  expect(url?.href).toBe(
    "https://0d9e27d14127c0eeadfc34b424cc7ed0.preview.bl.run/api/download?session=abc&v=custom",
  );
});

it("rejects unsafe query parameter names", () => {
  const url = resolveSandboxDownloadUrl({
    templates: [template],
    templateId: "webpage-assistant",
    versionId: "product-docs",
    downloadSearch: "?../secret=abc",
  });

  expect(url).toBeNull();
});

it("rejects non-sandbox catalog hosts", () => {
  const url = resolveSandboxDownloadUrl({
    templates: [{ ...template, sandboxBaseUrl: "https://example.com" }],
    templateId: "webpage-assistant",
    versionId: "product-docs",
    downloadSearch: "?session=abc",
  });

  expect(url).toBeNull();
});
