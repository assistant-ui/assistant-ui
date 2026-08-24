"use client";

import { useTheme } from "next-themes";
import { useEffect, useState, type ComponentProps } from "react";

export function DemoIframe({ src, ...props }: ComponentProps<"iframe">) {
  const { resolvedTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const themedSrc =
    mounted && src
      ? `${src}${src.includes("?") ? "&" : "?"}theme=${resolvedTheme ?? "light"}`
      : undefined;

  return <iframe src={themedSrc} {...props} />;
}
