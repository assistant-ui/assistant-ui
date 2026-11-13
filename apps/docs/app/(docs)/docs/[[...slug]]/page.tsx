import type { Metadata } from "@farm.js/core";
import { source } from "@/lib/source";
import { routeSegments } from "@/lib/route-segments";
import {
  DocsRoutePage,
  docsRouteMetadata,
  overviewFallback,
} from "@/components/pages/docs/layout/docs-route";

type Props = { params: Promise<{ slug?: string | string[] }> };

export default async function Page(props: Props) {
  const slug = routeSegments((await props.params).slug);
  return (
    <DocsRoutePage
      slug={slug}
      loader={source}
      tree={source.pageTree}
      contentDir="apps/docs/content/docs"
      platformAware
      fallbackUrl={overviewFallback(source)}
    />
  );
}

export function generateStaticParams() {
  return source.generateParams();
}

export async function generateMetadata(props: Props): Promise<Metadata> {
  const slug = routeSegments((await props.params).slug);
  return docsRouteMetadata({
    slug,
    loader: source,
    tree: source.pageTree,
    platformAware: true,
  });
}
