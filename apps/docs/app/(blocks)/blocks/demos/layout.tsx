import type { Metadata } from "next";
import type { ReactNode } from "react";
import { BlockThemeListener } from "@/components/pages/blocks/block-theme-listener";
import { SampleScope } from "@/components/pages/docs/samples/sample-scope";
import { MAIN_CONTENT_PROPS } from "@/components/shared/skip-link";

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The frame every demo block renders in: a full-height page with no site
 * header, for the block viewer to show. A block's own files sit in its folder.
 */
export default function BlockDemosLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-background h-dvh overflow-hidden">
      {/* The docs stylesheet sets `overflow-y: scroll` on html, which leaves a scrollbar strip inside a frame. */}
      <style>{`html { overflow: hidden; }`}</style>
      <BlockThemeListener />
      <main {...MAIN_CONTENT_PROPS} data-block-preview className="h-full">
        <SampleScope>{children}</SampleScope>
      </main>
    </div>
  );
}
