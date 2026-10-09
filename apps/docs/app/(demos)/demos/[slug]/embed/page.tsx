import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsRuntimeProvider } from "@/runtimes/docs";
import { DEMOS, getDemo } from "@/lib/demos";

export function generateStaticParams() {
  return DEMOS.map((demo) => ({ slug: demo.slug }));
}

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * Chrome-free variant for embedding. A separate route rather than a query
 * param so both this and the full demo stay statically generated.
 */
export default async function DemoEmbedPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) notFound();

  const DemoComponent = demo.component;

  return (
    <div className="bg-background flex h-dvh flex-col overflow-hidden">
      {/* The docs stylesheet sets `overflow-y: scroll` on html for gutter stability; inside the embed iframe that reserves a permanent scrollbar strip along the right edge wherever the platform draws classic scrollbars. */}
      <style>{`html { overflow: hidden; }`}</style>
      <main className="min-h-0 flex-1">
        <DocsRuntimeProvider>
          <DemoComponent />
        </DocsRuntimeProvider>
      </main>
    </div>
  );
}
