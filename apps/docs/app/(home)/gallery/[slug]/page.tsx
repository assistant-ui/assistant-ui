import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { createOgMetadata } from "@/lib/og";
import { GALLERY_WIDGETS, getWidget } from "@/lib/gallery";
import { WidgetDetail } from "@/components/gallery/widget-detail";

type Params = { slug: string };

export function generateStaticParams(): Params[] {
  return GALLERY_WIDGETS.map((widget) => ({ slug: widget.slug }));
}

function getWidgetSource(slug: string): string | null {
  try {
    return readFileSync(
      join(process.cwd(), "components/gallery/widgets", `${slug}.tsx`),
      "utf8",
    ).trim();
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const widget = getWidget(slug);
  if (!widget) return {};

  const title = `${widget.title} — Generative UI Gallery`;
  return {
    title,
    description: widget.description,
    ...createOgMetadata(title, widget.description),
  };
}

export default async function GalleryWidgetPage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  if (!getWidget(slug)) notFound();
  return <WidgetDetail slug={slug} source={getWidgetSource(slug)} />;
}
