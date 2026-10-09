import type { Metadata } from "next";
import { source } from "@/lib/source";
import {
  DocsRoutePage,
  docsRouteMetadata,
  overviewFallback,
} from "@/components/pages/docs/layout/docs-route";

export default async function Page(props: PageProps<"/docs/[[...slug]]">) {
  const { slug = [] } = await props.params;
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

export async function generateMetadata(
  props: PageProps<"/docs/[[...slug]]">,
): Promise<Metadata> {
  const { slug = [] } = await props.params;
  return docsRouteMetadata({
    slug,
    loader: source,
    tree: source.pageTree,
    platformAware: true,
  });
}
