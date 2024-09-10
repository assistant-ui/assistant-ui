import { getPages, getPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EditIcon } from "lucide-react";
import defaultMdxComponents from "fumadocs-ui/mdx";

export default async function Page({
  params,
}: {
  params: { slug?: string[] };
}) {
  const page = getPage(params.slug ?? []);

  if (page == null) {
    notFound();
  }

  const path = `apps/docs/content/docs/${page.file.path}`;

  const footer = (
    <a
      href={`https://github.com/Yonom/assistant-ui/blob/main/${path}`}
      target="_blank"
      rel="noreferrer noopener"
      className={cn(
        buttonVariants({
          variant: "secondary",
          size: "sm",
          className: "gap-1.5 text-xs",
        }),
      )}
    >
      <EditIcon className="size-3" />
      Edit on Github
    </a>
  );

  return (
    <DocsPage
      toc={(page.data as any).exports.toc}
      full={(page.data as any).full}
      tableOfContent={{ footer }}
    >
      <DocsBody>
        <h1>{(page.data as any).title}</h1>
        <page.data.body components={defaultMdxComponents} />
      </DocsBody>
    </DocsPage>
  );
}

export async function generateStaticParams() {
  return getPages()
    .filter((page) => page.slugs[0] === "docs")
    .map((page) => ({
      slug: page.slugs.slice(1),
    }));
}

export function generateMetadata({ params }: { params: { slug?: string[] } }) {
  const page = getPage(params.slug ?? []);

  if (page == null) notFound();

  return {
    title: (page.data as any).title,
    description: (page.data as any).description,
  } satisfies Metadata;
}
