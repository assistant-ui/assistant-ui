"use client";

import {
  Children,
  cloneElement,
  isValidElement,
  useCallback,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  PlatformScope,
  isVisibleForPlatform,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatformOrDefault,
} from "./context";
import {
  Tabs,
  escapeValue,
  type TabsProps,
} from "@/components/docs/fumadocs/tabs";

const ITEMS = PLATFORMS.map((p) => PLATFORM_LABELS[p]);
const VALUE_TO_PLATFORM: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [escapeValue(PLATFORM_LABELS[p]), p]),
);

export type PlatformTabsProps = Omit<
  TabsProps,
  "items" | "defaultIndex" | "value" | "onValueChange"
>;

export function PlatformTabs(props: PlatformTabsProps): React.ReactElement {
  const platform = usePlatformOrDefault();
  return (
    <PlatformTabsInner key={platform} defaultPlatform={platform} {...props} />
  );
}

// Local tab selection previews this group only, does not update
// global platform. Global overrides this on navigation (via key remount).
function PlatformTabsInner({
  defaultPlatform,
  ...props
}: PlatformTabsProps & { defaultPlatform: Platform }): React.ReactElement {
  const [localPlatform, setLocalPlatform] = useState(defaultPlatform);

  const handleValueChange = useCallback((value: string) => {
    const next = VALUE_TO_PLATFORM[value];
    if (next) setLocalPlatform(next);
  }, []);

  return (
    <PlatformScope platform={localPlatform}>
      <Tabs
        {...props}
        items={ITEMS}
        value={escapeValue(PLATFORM_LABELS[localPlatform])}
        onValueChange={handleValueChange}
      />
    </PlatformScope>
  );
}

export function PlatformOnly({
  children,
  except,
  platforms,
}: {
  children: ReactNode;
  except?: readonly Platform[];
  platforms?: readonly Platform[];
}) {
  const platform = usePlatformOrDefault();

  if (except?.includes(platform)) return null;
  if (!isVisibleForPlatform(platforms, platform)) return null;

  return <>{children}</>;
}

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
