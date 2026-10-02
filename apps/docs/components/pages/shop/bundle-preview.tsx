"use client";

import { Button } from "@/components/ui/button";
import { useTheme } from "next-themes";
import { ArrowUpRight } from "lucide-react";
import { bundlePreviewHref } from "@/lib/example-bundles";

export function BundlePreview({ slug }: { slug: string }) {
  const { resolvedTheme } = useTheme();
  const href = resolvedTheme
    ? `${bundlePreviewHref(slug)}?theme=${resolvedTheme === "dark" ? "dark" : "light"}`
    : undefined;
  return (
    <Button
      variant="outline"
      nativeButton={false}
      render={<a href={href} target="_blank" rel="noopener noreferrer" />}
    >
      Full-screen preview
      <ArrowUpRight aria-hidden data-icon="inline-end" />
    </Button>
  );
}
