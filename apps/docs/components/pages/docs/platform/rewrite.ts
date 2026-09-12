import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import type { Platform, Surface } from "@/lib/constants";
import { isSurface } from "@/lib/docs-platform";

// Negative lookahead avoids matching siblings like `@assistant-ui/react-langgraph`.
const PACKAGE_PATTERN = /@assistant-ui\/react(?![-\w])/g;

const PLATFORM_PACKAGE: Record<Surface, string> = {
  react: "@assistant-ui/react",
  rn: "@assistant-ui/react-native",
  ink: "@assistant-ui/react-ink",
};

export function rewritePlatformPackages(
  node: ReactNode,
  platform: Platform,
): ReactNode {
  if (!isSurface(platform) || platform === "react") return node;

  if (typeof node === "string") {
    return node.replace(PACKAGE_PATTERN, PLATFORM_PACKAGE[platform]);
  }
  if (Array.isArray(node)) {
    // Children.map auto-keys the siblings; bare Array.map would warn on Shiki spans.
    return Children.map(node, (child) =>
      rewritePlatformPackages(child, platform),
    );
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const { children } = node.props;
    if (children === undefined) return node;
    return cloneElement(node, {
      children: rewritePlatformPackages(children, platform),
    });
  }
  return node;
}
