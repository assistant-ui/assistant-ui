"use client";

import { useTheme } from "next-themes";
import { type ComponentProps } from "react";
import { useHydrated } from "@/hooks/use-hydrated";

export function DemoIframe({
  src,
  title,
  ...props
}: ComponentProps<"iframe"> & { title: string }) {
  const { resolvedTheme } = useTheme();
  const mounted = useHydrated();

  const themedSrc =
    mounted && src
      ? `${src}${src.includes("?") ? "&" : "?"}theme=${resolvedTheme ?? "light"}`
      : undefined;

  return <iframe src={themedSrc} title={title} {...props} />;
}
