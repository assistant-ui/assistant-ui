import { describe, expect, it } from "vitest";
import {
  buildDownloadCommand,
  registryFileUrl,
  type LinkedFile,
} from "./install-source";

const file: LinkedFile = {
  name: "mcp-config",
  path: "components/assistant-ui/elements/mcp-config.aui.tsx",
  content: "export const mcpConfig = true;",
  sourceUrl:
    "https://r.assistant-ui.com/files/radix/mcp-config/components/assistant-ui/elements/mcp-config.aui.tsx",
};

describe("registry file sources", () => {
  it("points at the packaged file for each flavor", () => {
    expect(registryFileUrl(file, "radix")).toBe(file.sourceUrl);
    expect(registryFileUrl(file, "base")).toBe(
      "https://r.assistant-ui.com/files/base/mcp-config/components/assistant-ui/elements/mcp-config.aui.tsx",
    );
  });

  it("preserves nested registry item names in the artifact path", () => {
    expect(
      registryFileUrl(
        {
          ...file,
          name: "chat/b/ai-sdk-quick-start/json",
          path: "app/assistant.tsx",
        },
        "radix",
      ),
    ).toBe(
      "https://r.assistant-ui.com/files/radix/chat/b/ai-sdk-quick-start/json/app/assistant.tsx",
    );
  });

  it("preserves the consumer path in the curl command", () => {
    expect(buildDownloadCommand([file])).toBe(
      "curl -sSL --create-dirs \\\n  -o components/assistant-ui/elements/mcp-config.aui.tsx https://r.assistant-ui.com/files/radix/mcp-config/components/assistant-ui/elements/mcp-config.aui.tsx",
    );
  });
});
