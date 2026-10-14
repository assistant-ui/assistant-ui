import { notFound } from "next/navigation";
import { siteTree } from "@/lib/source";
import { DOCS_SITES, docsSiteBaseUrl, getDocsSite } from "@/lib/docs-sites";
import { DocsRootLayout } from "@/components/pages/docs/layout/docs-root-layout";
import { DocsSiteHeader } from "@/components/pages/docs/layout/docs-site-header";

export default async function Layout({
  children,
  params,
}: LayoutProps<"/[site]/docs">) {
  const site = getDocsSite((await params).site);
  if (!site) notFound();

  return (
    <DocsRootLayout
      tree={siteTree(site.id)}
      section={site.title}
      sectionHref={docsSiteBaseUrl(site.id)}
      platformSwitcher={false}
      header={<DocsSiteHeader site={site.id} />}
    >
      {children}
    </DocsRootLayout>
  );
}

export function generateStaticParams() {
  return DOCS_SITES.map((site) => ({ site: site.id }));
}
