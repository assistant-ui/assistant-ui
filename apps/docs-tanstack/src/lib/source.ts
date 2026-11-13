import { loader } from "fumadocs-core/source";
import { lucideIconsPlugin } from "fumadocs-core/source/lucide-icons";
import * as c from "collections/server";

export const SITES = [
  "diagrammatic",
  "generative-frame",
  "remote-components",
  "safe-content-frame",
] as const;

function siteSource(id: string) {
  const all = c.docsSites.toFumadocsSource();
  const prefix = `${id}/`;
  return {
    files: all.files
      .filter((f) => f.path.startsWith(prefix))
      .map((f) => ({ ...f, path: f.path.slice(prefix.length) })),
  };
}

const mk = (baseUrl: string, src: { files: any[] }) =>
  loader({ baseUrl, source: src as any, plugins: [lucideIconsPlugin()] });

export const sources = {
  docs: mk("/docs", c.docs.toFumadocsSource()),
  elements: mk("/elements", c.elements.toFumadocsSource()),
  design: mk("/design", c.design.toFumadocsSource()),
  examples: mk("/examples", c.examples.toFumadocsSource()),
  blog: mk("/blog", c.blog.toFumadocsSource()),
  careers: mk("/careers", c.careers.toFumadocsSource()),
  ...Object.fromEntries(
    SITES.map((s) => [`site:${s}`, mk(`/${s}/docs`, siteSource(s))]),
  ),
} as Record<string, ReturnType<typeof mk>>;
