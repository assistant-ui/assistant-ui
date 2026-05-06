"use client";

import { useCallback, useEffect, useState } from "react";
import { Tabs, escapeValue, type TabsProps } from "./tabs";
import {
  PlatformScope,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
  usePlatform,
} from "@/components/docs/contexts/platform";

const ITEMS = PLATFORMS.map((p) => PLATFORM_LABELS[p]);
const VALUE_TO_PLATFORM: Record<string, Platform> = Object.fromEntries(
  PLATFORMS.map((p) => [escapeValue(PLATFORM_LABELS[p]), p]),
);

export type PlatformTabsProps = Omit<
  TabsProps,
  "items" | "defaultIndex" | "value" | "onValueChange"
>;

export function PlatformTabs(props: PlatformTabsProps): React.ReactElement {
  const { platform } = usePlatform();

  // Local tab selection previews this group only, does not update
  // global platform, global overrides this on navigation.
  const [localPlatform, setLocalPlatform] = useState(platform);

  useEffect(() => {
    setLocalPlatform(platform);
  }, [platform]);

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
