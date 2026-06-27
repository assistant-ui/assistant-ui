import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { galleryWidgets } from "@/components/gallery/specs";
import { WidgetDetailClient } from "./detail-client";

export function generateStaticParams() {
  return galleryWidgets.map((w) => ({ slug: w.slug }));
}

export default async function WidgetDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const widget = galleryWidgets.find((w) => w.slug === slug);
  if (!widget) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 md:py-24">
      <Link
        href="/gallery"
        className="text-muted-foreground hover:text-foreground mb-8 inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-4 w-4" />
        Back to gallery
      </Link>
      <header className="mb-8">
        <h1 className="text-2xl font-medium tracking-tight">{widget.title}</h1>
        <p className="text-muted-foreground mt-1">{widget.description}</p>
      </header>
      <WidgetDetailClient spec={widget.spec} />
    </main>
  );
}
