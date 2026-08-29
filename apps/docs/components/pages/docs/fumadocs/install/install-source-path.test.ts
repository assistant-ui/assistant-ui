import { describe, expect, it } from "vitest";
import {
  githubBlobUrl,
  githubRawUrl,
  githubSourcePath,
} from "./install-source-path";

const templateSources = [
  [
    "templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
    "apps/registry/templates/ai-sdk-backend-resumable/app/api/chat/route.ts",
  ],
  [
    "templates/ai-sdk-backend-resumable/app/api/chat/resume/[streamId]/route.ts",
    "apps/registry/templates/ai-sdk-backend-resumable/app/api/chat/resume/[streamId]/route.ts",
  ],
  [
    "templates/ai-sdk-backend-resumable/lib/resumable-context.ts",
    "apps/registry/templates/ai-sdk-backend-resumable/lib/resumable-context.ts",
  ],
  ["templates/eve/app/page.tsx", "apps/registry/templates/eve/app/page.tsx"],
] as const;

describe("githubSourcePath", () => {
  it("maps template sources to the registry template root", () => {
    for (const [sourcePath, repositoryPath] of templateSources) {
      expect(githubSourcePath(sourcePath)).toBe(repositoryPath);
      expect(githubBlobUrl(sourcePath)).toBe(
        `https://github.com/assistant-ui/assistant-ui/blob/main/${repositoryPath}`,
      );
      expect(githubRawUrl(sourcePath)).toBe(
        `https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/${repositoryPath}`,
      );
    }
  });

  it("maps UI sources to the packages/ui root", () => {
    const sourcePath =
      "../../packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx";

    expect(githubSourcePath(sourcePath)).toBe(
      "packages/ui/src/components/react/assistant-ui/elements/thread.aui.tsx",
    );
  });
});
