import { describe, expect, it } from "vitest";
import { githubSourcePath } from "./install-source-path";

describe("githubSourcePath", () => {
  it("resolves a primitive through its flavor directory", () => {
    expect(githubSourcePath("components/ui/accordion.tsx", "base")).toBe(
      "components/react/ui/base/accordion.tsx",
    );
    expect(githubSourcePath("components/ui/accordion.tsx", "radix")).toBe(
      "components/react/ui/radix/accordion.tsx",
    );
  });

  it("prefers the radix twin the registry build ships", () => {
    expect(githubSourcePath("components/ui/direction.tsx", "radix")).toBe(
      "components/react/ui/radix/direction.radix.tsx",
    );
  });

  it("falls back to the other flavor for a primitive that ships in one", () => {
    expect(githubSourcePath("components/ui/carousel.tsx", "base")).toBe(
      "components/react/ui/radix/carousel.tsx",
    );
  });

  it("resolves elements and icons under components/react", () => {
    expect(
      githubSourcePath(
        "components/assistant-ui/elements/thread.aui.tsx",
        "base",
      ),
    ).toBe("components/react/assistant-ui/elements/thread.aui.tsx");
    expect(githubSourcePath("components/icons/github.tsx", "base")).toBe(
      "components/react/icons/github.tsx",
    );
  });

  it("returns paths the kit does not own untouched", () => {
    expect(githubSourcePath("app/page.tsx", "base")).toBe("app/page.tsx");
    expect(githubSourcePath("hooks/use-copy-to-clipboard.ts", "base")).toBe(
      "hooks/use-copy-to-clipboard.ts",
    );
  });
});
