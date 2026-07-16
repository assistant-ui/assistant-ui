import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { GALLERY_TEMPLATES, getGalleryTemplate } from "@/lib/gallery-templates";
import { TemplateDetail } from "@/components/gallery/template-detail";

interface Params {
  slug: string;
}

export function generateStaticParams(): Params[] {
  return GALLERY_TEMPLATES.map((template) => ({ slug: template.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<Params>;
}): Promise<Metadata> {
  const { slug } = await params;
  const template = getGalleryTemplate(slug);
  if (!template) return { title: "Not Found" };

  return {
    title: template.title,
    description: template.description,
    ...createOgMetadata(template.title, template.description),
  };
}

export default async function GalleryTemplatePage({
  params,
}: {
  params: Promise<Params>;
}) {
  const { slug } = await params;
  const template = getGalleryTemplate(slug);
  if (!template) notFound();

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-16 md:py-24">
      <Link
        href="/gallery"
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Gallery
      </Link>

      <header className="mt-8 mb-10 max-w-2xl">
        <p className="text-muted-foreground mb-3 text-sm">
          {template.category}
        </p>
        <h1 className="text-2xl font-medium tracking-tight">
          {template.title}
        </h1>
        <p className="text-muted-foreground mt-2">{template.description}</p>
      </header>

      <TemplateDetail template={template} />
    </main>
  );
}
