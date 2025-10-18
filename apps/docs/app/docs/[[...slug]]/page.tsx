import { getPages, getPage } from "@/app/source";
import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import { LLMCopyButton, AIActions } from "@/components/ai/page-actions";
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
  const markdownUrl = `${page.url}.mdx`;
  const githubUrl = `https://github.com/assistant-ui/assistant-ui/blob/main/${path}`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${path}`;
  const footer = (
    <div className="flex flex-col gap-1.5">
      <LLMCopyButton markdownUrl={markdownUrl} />
      <AIActions
        markdownUrl={markdownUrl}
        githubUrl={githubUrl}
        githubEditUrl={githubEditUrl}
      />
    </div>
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
}): Promise<Metadata> {
  const params = await props.params;
  const page = getPage(params.slug ?? []);

  if (page == null) notFound();

  return {
    title: page.data.title,
    description: page.data.description ?? null,
  };
}
