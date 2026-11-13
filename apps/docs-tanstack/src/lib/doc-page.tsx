import { createServerFn } from "@tanstack/react-start";
import { notFound } from "@tanstack/react-router";
import browserCollections from "collections/browser";
import { DocsLayout } from "fumadocs-ui/layouts/docs";
import {
  DocsBody,
  DocsDescription,
  DocsPage,
  DocsTitle,
} from "fumadocs-ui/layouts/docs/page";
import { useFumadocsLoader } from "fumadocs-core/source/client";
import { getMDXComponents } from "./mdx-components";

export type Key = string; // docs | elements | ... | site:<id>

export const loadPage = createServerFn({ method: "GET" })
  .inputValidator((d: { key: Key; slugs: string[] }) => d)
  .handler(async ({ data: { key, slugs } }) => {
    const { sources } = await import("./source");
    const source = sources[key];
    if (!source) throw notFound();
    const page = source.getPage(slugs);
    if (!page) throw notFound();
    return {
      path: page.path,
      // docsSites pages live under <site>/ in the collection
      file: key.startsWith("site:")
        ? `${key.slice(5)}/${page.path}`
        : page.path,
      title: page.data.title as string,
      description: page.data.description as string | undefined,
      pageTree: await source.serializePageTree(source.getPageTree()),
    };
  });

const collectionOf = (key: Key) =>
  key.startsWith("site:") ? "docsSites" : key;

const render = ({ toc, default: MDX, frontmatter }: any) => (
  <DocsPage toc={toc}>
    <DocsTitle>{frontmatter.title}</DocsTitle>
    <DocsDescription>{frontmatter.description}</DocsDescription>
    <DocsBody>
      <MDX components={getMDXComponents()} />
    </DocsBody>
  </DocsPage>
);

const loaders = Object.fromEntries(
  [
    "docs",
    "docsSites",
    "elements",
    "design",
    "examples",
    "blog",
    "careers",
  ].map((id) => [
    id,
    (browserCollections as any)[id].createClientLoader({
      id,
      component: render,
    }),
  ]),
);

export const clientLoaderFor = (key: Key) => loaders[collectionOf(key)]!;

export async function routeLoader(key: Key, splat: string | undefined) {
  const data = await loadPage({
    data: { key, slugs: splat?.split("/").filter(Boolean) ?? [] },
  });
  await clientLoaderFor(key).preload(data.file);
  return { ...data, key };
}

export function DocRoute({
  data,
}: {
  data: Awaited<ReturnType<typeof routeLoader>>;
}) {
  const { pageTree } = useFumadocsLoader(data);
  const Content = clientLoaderFor(data.key).getComponent(data.file);
  return (
    <DocsLayout tree={pageTree} nav={{ title: "assistant-ui" }}>
      <Content />
    </DocsLayout>
  );
}
