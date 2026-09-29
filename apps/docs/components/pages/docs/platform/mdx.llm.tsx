import { Children, isValidElement, type ReactNode } from "react";
import {
  DEFAULT_PLATFORM,
  PLATFORM_LABELS,
  PLATFORMS,
  type Platform,
} from "@/lib/constants";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import type { PlatformTabsProps } from "./mdx";

// Emit only the requested platform tab so the text does not read like every
// platform-specific instruction applies at once.
export function PlatformTabsLLM(
  { children }: PlatformTabsProps,
  ctx?: LLMRenderContext,
): ReactNode {
  const platform = ctx?.platform ?? DEFAULT_PLATFORM;
  const tabs = Children.toArray(children).filter(isValidElement);
  const selectedTab = tabs.find(
    (child) =>
      (child.props as { value?: string }).value === PLATFORM_LABELS[platform],
  );
  if (!selectedTab) return null;

  return (
    <>
      <p>
        <strong>{PLATFORM_LABELS[platform]}</strong>
      </p>
      {selectedTab}
    </>
  );
}

export function PlatformOnlyLLM(
  {
    children,
    except,
    platforms,
  }: {
    children: ReactNode;
    except?: readonly Platform[];
    platforms?: readonly Platform[];
  },
  ctx?: LLMRenderContext,
): ReactNode {
  const platform = ctx?.platform ?? DEFAULT_PLATFORM;
  if (except?.includes(platform)) return null;
  if (platforms && platforms.length > 0 && !platforms.includes(platform))
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
