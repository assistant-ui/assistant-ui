import { describe, expect, it } from "vitest";
import { DEMO_DOWNLOAD_MANIFESTS } from "./manifest";

const cloneSlugs = [
  "chatgpt",
  "claude",
  "gemini",
  "grok",
  "perplexity",
] as const;

describe("clone demo download manifests", () => {
  it.each(cloneSlugs)("includes the shared sidebar sources for %s", (slug) => {
    const sources = DEMO_DOWNLOAD_MANIFESTS[slug].extraSourceFiles;

    expect(sources).toContain(
      "apps/docs/components/examples/clone-thread-shell.tsx",
    );
    expect(sources).toContain(
      "packages/ui/src/components/assistant-ui/thread-list.tsx",
    );
    expect(sources).toContain("packages/ui/src/components/ui/base/input.tsx");
    expect(sources).toContain(
      "packages/ui/src/components/ui/base/skeleton.tsx",
    );
    expect(sources).toContain("packages/ui/src/components/ui/radix/sheet.tsx");
  });
});
