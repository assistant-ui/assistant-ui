import { ExamplePreviewSurface } from "@/components/examples/ExamplePreviewSurface";
import {
  EXAMPLE_PREVIEW_SLUGS,
  isExamplePreviewSlug,
} from "@/components/examples/example-preview-data";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const metadata: Metadata = {
  title: "Example Preview",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function Page({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  if (!isExamplePreviewSlug(slug)) notFound();

  return (
    <main className="h-screen w-screen overflow-hidden bg-background">
      <ExamplePreviewSurface slug={slug} />
    </main>
  );
}

export function generateStaticParams() {
  return EXAMPLE_PREVIEW_SLUGS.map((slug) => ({ slug }));
}
