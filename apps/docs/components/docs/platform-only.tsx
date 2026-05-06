"use client";

import type { ReactNode } from "react";
import {
  isVisibleForPlatform,
  type Platform,
  usePlatformOrDefault,
} from "@/components/docs/contexts/platform";

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
