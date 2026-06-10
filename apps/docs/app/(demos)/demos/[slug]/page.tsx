import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { DocsRuntimeProvider } from "@/contexts/DocsRuntimeProvider";
import { DEMOS, getDemo } from "@/lib/demos";
import { createOgMetadata } from "@/lib/og";
import { DemoHeader } from "./demo-header";

export function generateStaticParams() {
  return DEMOS.map((demo) => ({ slug: demo.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const demo = getDemo(slug);
  if (!demo) return {};

  const title = `${demo.name} demo`;
  return {
    title,
    description: demo.description,
    ...createOgMetadata(title, demo.description),
  };
}

export default async function DemoPage({
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
      <DemoHeader slug={demo.slug} />
      <main className="min-h-0 flex-1">
        <DocsRuntimeProvider>
          <DemoComponent />
        </DocsRuntimeProvider>
      </main>
    </div>
  );
}
