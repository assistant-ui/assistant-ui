import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { rewritePlatformPackages } from "./rewrite";

describe("rewritePlatformPackages", () => {
  it("rewrites the web package without changing adapter package names", () => {
    expect(
      rewritePlatformPackages(
        "@assistant-ui/react @assistant-ui/react-ai-sdk",
        "rn",
      ),
    ).toBe("@assistant-ui/react-native @assistant-ui/react-ai-sdk");
  });

  it("rewrites package names inside nested code nodes", () => {
    const node = createElement(
      "code",
      null,
      'import { Thread } from "@assistant-ui/react";',
    );
    const rewritten = rewritePlatformPackages(node, "ink");

    expect(rewritten).toMatchObject({
      props: {
        children: 'import { Thread } from "@assistant-ui/react-ink";',
      },
    });
  });

  it("preserves React content by reference", () => {
    const node = createElement("code", null, "@assistant-ui/react");
    expect(rewritePlatformPackages(node, "react")).toBe(node);
  });
});
