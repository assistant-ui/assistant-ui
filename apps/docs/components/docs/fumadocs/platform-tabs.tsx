"use client";

import { Tabs, escapeValue, type TabsProps } from "./tabs";
import {
  usePlatform,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
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
  const { platform, setPlatform } = usePlatform();
  return (
    <Tabs
      {...props}
      items={ITEMS}
      value={escapeValue(PLATFORM_LABELS[platform])}
      onValueChange={(v) => {
        const next = VALUE_TO_PLATFORM[v];
        if (next) setPlatform(next);
      }}
    />
  );
}
