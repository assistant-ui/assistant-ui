import { Children, isValidElement, type ReactNode } from "react";
import {
  DEFAULT_PLATFORM,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
} from "@/lib/constants";
import type { PlatformTabsProps } from "./mdx";

// Emit only the React (default) tab — other platforms duplicate content and have
// their own doc trees (/docs/react-native, /docs/ink). Label it so the code isn't
// read as universal.
export function PlatformTabsLLM({ children }: PlatformTabsProps): ReactNode {
  const tabs = Children.toArray(children).filter(isValidElement);
  const reactTab =
    tabs.find(
      (child) =>
        (child.props as { value?: string }).value ===
        PLATFORM_LABELS[DEFAULT_PLATFORM],
    ) ?? tabs[0];
  if (!reactTab) return null;

  return (
    <>
      <p>
        <strong>{PLATFORM_LABELS[DEFAULT_PLATFORM]}</strong>
      </p>
      {reactTab}
    </>
  );
}

export function PlatformOnlyLLM({
  children,
  except,
  platforms,
}: {
  children: ReactNode;
  except?: readonly Platform[];
  platforms?: readonly Platform[];
}): ReactNode {
  if (except?.includes(DEFAULT_PLATFORM)) return null;
  if (
    platforms &&
    platforms.length > 0 &&
    !platforms.includes(DEFAULT_PLATFORM)
  )
    return null;

  const applicable = PLATFORMS.filter(
    (p) =>
      (!platforms || platforms.length === 0 || platforms.includes(p)) &&
      !except?.includes(p),
  );
  const label = applicable.map((p) => PLATFORM_LABELS[p]).join(", ");

  return (
    <>
      <p>
        <strong>{`${label} only`}</strong>
      </p>
      {children}
    </>
  );
}
