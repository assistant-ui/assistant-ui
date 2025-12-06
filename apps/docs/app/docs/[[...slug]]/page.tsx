import type { Metadata } from "next";
import { DocsPage, DocsBody } from "fumadocs-ui/page";
import { notFound } from "next/navigation";
import { cn } from "@/lib/utils";
import { buttonVariants } from "@/components/ui/button";
import { EditIcon } from "lucide-react";
import { getMDXComponents } from "@/mdx-components";
import { DocsRuntimeProvider } from "@/app/(home)/DocsRuntimeProvider";
import { source } from "@/lib/source";
import { getPageTreePeers } from "fumadocs-core/page-tree";
import { Card, Cards } from "fumadocs-ui/components/card";
import {
  CopyMarkdownButton,
  PageActionsDropdown,
} from "@/components/docs/page-actions";
import { Footer } from "@/components/shared/footer";

function DocsCategory({ url }: { url?: string }) {
  const effectiveUrl = url ?? "";
  return (
    <Cards>
      {getPageTreePeers(source.pageTree, effectiveUrl).map((peer) => (
        <Card key={peer.url} title={peer.name} href={peer.url}>
          {peer.description}
        </Card>
      ))}
    </Cards>
  );
}

export default async function Page(props: {
  params: Promise<{ slug?: string[] }>;
}) {
  const params = await props.params;
  const page = source.getPage(params.slug ?? []);

  if (page == null) {
    notFound();
  }

  const mdxComponents = getMDXComponents({
    DocsCategory: DocsCategory,
  });

  const path = `apps/docs/content/docs/${page.path}`;
  const markdownUrl = `${page.url}.mdx`;
  const githubUrl = `https://github.com/assistant-ui/assistant-ui/blob/main/${path}`;
  const githubEditUrl = `https://github.com/assistant-ui/assistant-ui/edit/main/${path}`;

  const editOnGitHub = (
    <a
      href={githubEditUrl}
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
      tableOfContent={{ footer: editOnGitHub }}
      footer={{
        enabled: true,
        component: <Footer />,
      }}
    >
      <DocsBody>
        <h1>{page.data.title}</h1>
        <div className="not-prose mb-6 flex gap-2">
          <CopyMarkdownButton markdownUrl={markdownUrl} />
          <PageActionsDropdown
            markdownUrl={markdownUrl}
            githubUrl={githubUrl}
          />
        </div>
        {page.data.description && (
          <p className="mb-4 text-muted-foreground">{page.data.description}</p>
        )}
        <DocsRuntimeProvider>
          <page.data.body components={mdxComponents} />
        </DocsRuntimeProvider>
      </DocsBody>
    </DocsPage>
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  const page = source.getPage(slug);
  if (!page)
    return {
      title: "Not Found",
    };

  return {
    title: page.data.title,
    description: page.data.description ?? null,
  } satisfies Metadata;
}
