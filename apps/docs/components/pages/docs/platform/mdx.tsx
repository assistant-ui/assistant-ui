"use client";

import { useCallback, useMemo, useState, type ReactNode } from "react";
import {
  PlatformScope,
  isVisibleForPlatform,
  PLATFORM_LABELS,
  SURFACES,
  type Platform,
  type Surface,
  usePlatformOrDefault,
  useSurfaceOrDefault,
} from "./context";
import {
  Tabs,
  escapeValue,
  type TabsProps,
} from "@/components/pages/docs/fumadocs/tabs";
import { rewritePlatformPackages } from "./rewrite";

const ITEMS = SURFACES.map((p) => PLATFORM_LABELS[p]);
const VALUE_TO_SURFACE: Record<string, Surface> = Object.fromEntries(
  SURFACES.map((p) => [escapeValue(PLATFORM_LABELS[p]), p]),
);

export type PlatformTabsProps = Omit<
  TabsProps,
  "items" | "defaultIndex" | "value" | "onValueChange"
>;

export function PlatformTabs(props: PlatformTabsProps): React.ReactElement {
  const surface = useSurfaceOrDefault();
  return (
    <PlatformTabsInner key={surface} defaultSurface={surface} {...props} />
  );
}

// Local tab selection previews this group only, does not update
// global platform. Global overrides this on navigation (via key remount).
function PlatformTabsInner({
  defaultSurface,
  ...props
}: PlatformTabsProps & { defaultSurface: Surface }): React.ReactElement {
  const [localPlatform, setLocalPlatform] = useState<Surface>(defaultSurface);

  const handleValueChange = useCallback((value: string) => {
    const next = VALUE_TO_SURFACE[value];
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

export function PlatformAwareCode({ children }: { children: ReactNode }) {
  const platform = usePlatformOrDefault();
  const rewritten = useMemo(
    () => rewritePlatformPackages(children, platform),
    [children, platform],
  );
  return <>{rewritten}</>;
}
