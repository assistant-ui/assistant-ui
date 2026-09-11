import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { createOgMetadata } from "@/lib/og";
import { DesignRail } from "@/components/pages/design/design-rail";
import {
  DESIGN_COMPONENTS,
  getDesignComponentMeta,
  getDesignSectionLabel,
} from "@/components/pages/design/registry-meta";
import { PageFrame } from "@/components/shared/page-frame";
import { typeEyebrow, typePage } from "@/components/shared/type";
import { design } from "@/lib/source";
import { getMDXComponents } from "@/mdx-components";
import { cn } from "@/lib/utils";

function getPage(slug: string) {
  return design.getPage(["components", slug]);
}

export function generateStaticParams() {
  return DESIGN_COMPONENTS.map((component) => ({ slug: component.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const meta = getDesignComponentMeta(slug);
  const page = getPage(slug);
  if (!meta || !page) return {};

  return {
    title: page.data.title,
    description: page.data.description,
    ...createOgMetadata(page.data.title, page.data.description),
  };
}

export default async function DesignComponentPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const meta = getDesignComponentMeta(slug);
  const page = meta ? getPage(slug) : undefined;
  if (!meta || !page) notFound();

  const section = getDesignSectionLabel(slug);
  const mdxComponents = getMDXComponents({});
  const links = page.data.links;
  const { body: MdxBody, toc: fullToc } = await page.data.load();
  const toc = fullToc.filter((item) => item.depth <= 3);

  return (
    <PageFrame pad="sub">
      <div className="gap-12 lg:grid lg:grid-cols-[11rem_minmax(0,1fr)] xl:grid-cols-[11rem_minmax(0,1fr)_11rem]">
        <aside className="hidden lg:block">
          <div className="bg-background fixed top-12 bottom-0 w-44 overflow-y-auto pt-20 pb-8">
            <DesignRail activeSlug={slug} />
          </div>
        </aside>

        <div className="min-w-0">
          <header>
            <p className={typeEyebrow}>
              <Link
                href="/design"
                className="hover:text-foreground transition-colors"
              >
                Design
              </Link>
              {" · "}
              <Link
                href="/design/components"
                className="hover:text-foreground transition-colors"
              >
                Components
              </Link>
              {section ? ` · ${section}` : null}
            </p>
            <h1 className={cn("mt-4", typePage)}>{page.data.title}</h1>
            {page.data.description ? (
              <p className="text-muted-foreground mt-4 max-w-md text-[15px] leading-relaxed">
                {page.data.description}
              </p>
            ) : null}
            {links && links.length > 0 ? (
              <div className="mt-5 flex flex-wrap items-center gap-4 text-[13px]">
                {links.map((link) =>
                  link.url.startsWith("/") ? (
                    <Link
                      key={link.url}
                      href={link.url}
                      className="text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  ) : (
                    <a
                      key={link.url}
                      href={link.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 transition-colors"
                    >
                      {link.label}
                      <ArrowUpRight className="size-3.5" />
                    </a>
                  ),
                )}
              </div>
            ) : null}
          </header>

          <article
            data-page-content=""
            className="docs-prose prose mt-12 max-w-none"
          >
            <MdxBody components={mdxComponents} />
          </article>
        </div>

        <aside className="hidden xl:block">
          {toc.length > 0 ? (
            <div className="bg-background fixed top-12 bottom-0 flex w-44 flex-col gap-2 overflow-y-auto pt-20 pb-8">
              <p className={typeEyebrow}>On this page</p>
              <div className="flex flex-col gap-1">
                {toc.map((item) => (
                  <a
                    key={item.url}
                    href={item.url}
                    className={cn(
                      "text-muted-foreground hover:text-foreground text-[13px] leading-relaxed transition-colors",
                      item.depth === 3 && "pl-3",
                    )}
                  >
                    {item.title}
                  </a>
                ))}
              </div>
            </div>
          ) : null}
        </aside>
      </div>
    </PageFrame>
  );
}
