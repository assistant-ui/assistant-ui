import { getPages, getPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(["reference", ...(params.slug ?? [])]);

  if (page == null) {
    notFound();
  }

  const MDX = (page.data as any).exports.default;

  return (
    <DocsPage toc={(page.data as any).exports.toc} full={(page.data as any).full}>
      <DocsBody>
        <h1>{(page.data as any).title}</h1>
        <MDX />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return getPages()
    .filter((page) => page.slugs[0] === "reference")
    .map((page) => ({
      slug: page.slugs.slice(1),
    }));
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(["reference", ...(params.slug ?? [])]);

  if (page == null) notFound();

  return {
    title: (page.data as any).title,
    description: (page.data as any).description,
  } satisfies Metadata;
}
