import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { docsSiteSources, siteTree } from "@/lib/source";
import { getDocsSite } from "@/lib/docs-sites";
import {
  DocsRoutePage,
  docsRouteMetadata,
  firstPageFallback,
} from "@/components/pages/docs/layout/docs-route";

export default async function Page(
  props: PageProps<"/[site]/docs/[[...slug]]">,
) {
  const { site: siteId, slug = [] } = await props.params;
  const site = getDocsSite(siteId);
  if (!site) notFound();

  const tree = siteTree(site.id);
  return (
    <DocsRoutePage
      slug={slug}
      loader={docsSiteSources[site.id]}
      tree={tree}
      contentDir={`apps/docs/content/docs-sites/${site.id}`}
      platformAware={false}
      fallbackUrl={firstPageFallback(tree)}
    />
  );
}

export function generateStaticParams({ params }: { params: { site: string } }) {
  const site = getDocsSite(params.site);
  if (!site) return [];
  return [{ slug: [] }, ...docsSiteSources[site.id].generateParams()];
}

export async function generateMetadata(
  props: PageProps<"/[site]/docs/[[...slug]]">,
): Promise<Metadata> {
  const { site: siteId, slug = [] } = await props.params;
  const site = getDocsSite(siteId);
  if (!site) return { title: "Not Found" };

  return docsRouteMetadata({
    slug,
    loader: docsSiteSources[site.id],
    tree: siteTree(site.id),
    platformAware: false,
    siteTitle: site.title,
  });
}
