import { getPages, getPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EditIcon } from "lucide-react";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = getPage(params.slug ?? []);
  const mdxComponents = getMDXComponents({});

  if (page == null) {
    notFound();
  }

  const path = `apps/docs/content/docs/${page.file.path}`;

  const footer = (
    <a
      href={`https://github.com/assistant-ui/assistant-ui/blob/main/${path}`}
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
      Edit on GitHub
    </a>
  );

  return (
    <DocsPage
      toc={page.data.toc}
      full={page.data.full ?? false}
      tableOfContent={{ footer }}
    >
      <DocsBody>
        <h1>{page.data.title}</h1>
        <DocsRuntimeProvider>
          <page.data.body components={mdxComponents} />
        </DocsRuntimeProvider>
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

export async function generateMetadata(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = getPage(params.slug ?? []);

  if (page == null) notFound();

  return {
    title: page.data.title,
    description: page.data.description ?? null,
  } satisfies Metadata;
}
