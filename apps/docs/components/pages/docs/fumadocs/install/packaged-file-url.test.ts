import { describe, expect, it } from "vitest";
import { buildDownloadCommand, packagedFileUrl } from "./packaged-file-url";

const streamRoute = {
  name: "ai-sdk-backend-resumable",
  path: "app/api/chat/resume/[streamId]/route.ts",
};

const nestedItem = {
  name: "chat/b/ai-sdk-quick-start/json",
  path: "app/assistant.tsx",
};

describe("packagedFileUrl", () => {
  it("percent-encodes bracketed route segments out of curl's URL globbing", () => {
    expect(packagedFileUrl("radix", streamRoute)).toBe(
      "https://r.assistant-ui.com/files/ai-sdk-backend-resumable/app/api/chat/resume/%5BstreamId%5D/route.ts",
    );
  });

  it("keeps the slashes of a nested item name as URL segments", () => {
    expect(packagedFileUrl("base", nestedItem)).toBe(
      "https://r.assistant-ui.com/base/files/chat/b/ai-sdk-quick-start/json/app/assistant.tsx",
    );
  });

  it("prefixes the base flavor under /base/files/", () => {
    expect(packagedFileUrl("base", streamRoute)).toContain(
      "https://r.assistant-ui.com/base/files/",
    );
    expect(packagedFileUrl("radix", streamRoute)).toContain(
      "https://r.assistant-ui.com/files/",
    );
  });
});

describe("buildDownloadCommand", () => {
  it("fails on HTTP errors instead of writing the error body into a source file", () => {
    expect(buildDownloadCommand([streamRoute], "radix")).toMatch(
      /^curl -fsSL --create-dirs/,
    );
  });

  it("single-quotes the -o path so bracketed segments survive zsh nomatch", () => {
    const command = buildDownloadCommand([streamRoute], "radix");
    expect(command).toContain(
      "-o 'app/api/chat/resume/[streamId]/route.ts' https://r.assistant-ui.com/files/ai-sdk-backend-resumable/app/api/chat/resume/%5BstreamId%5D/route.ts",
    );
  });

  it("emits one continuation line per file", () => {
    const command = buildDownloadCommand([streamRoute, nestedItem], "base");
    expect(command.split("\n")).toHaveLength(3);
    expect(command).toContain(
      "-o 'app/assistant.tsx' https://r.assistant-ui.com/base/files/chat/b/ai-sdk-quick-start/json/app/assistant.tsx",
    );
  });
});
