"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useMemo,
  type ReactNode,
} from "react";
import {
  usePlatformOrDefault,
  type Platform,
} from "@/components/docs/contexts/platform";

// Negative lookahead avoids matching siblings like `@assistant-ui/react-langgraph`.
const PACKAGE_PATTERN = /@assistant-ui\/react(?![-\w])/g;

const PLATFORM_PACKAGE: Record<Platform, string> = {
  react: "@assistant-ui/react",
  rn: "@assistant-ui/react-native",
  ink: "@assistant-ui/react-ink",
};

function rewrite(node: ReactNode, replacement: string): ReactNode {
  if (typeof node === "string") {
    return node.replace(PACKAGE_PATTERN, replacement);
  }
  if (Array.isArray(node)) {
    // Children.map auto-keys the siblings; bare Array.map would warn on Shiki spans.
    return Children.map(node, (child) => rewrite(child, replacement));
  }
  if (isValidElement<{ children?: ReactNode }>(node)) {
    const { children } = node.props;
    if (children === undefined) return node;
    return cloneElement(node, { children: rewrite(children, replacement) });
  }
  return node;
}

export function PlatformAwareCode({ children }: { children: ReactNode }) {
  const platform = usePlatformOrDefault();
  const replacement = PLATFORM_PACKAGE[platform];
  const rewritten = useMemo(
    () => (platform === "react" ? children : rewrite(children, replacement)),
    [children, platform, replacement],
  );
  return <>{rewritten}</>;
}
