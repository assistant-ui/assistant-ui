import type * as PageTree from "fumadocs-core/page-tree";
import {
  design,
  elementsDocs,
  examples as examplesSource,
  source,
} from "@/lib/source";
import { resolveDocsUrl } from "@/lib/docs-pages";
import { getLLMText } from "@/lib/get-llm-text";
import {
  ELEMENTS,
  elementRegistryName,
  getElement,
  type FlatElement,
} from "@/components/pages/elements/registry";
import { AUI_ELEMENT_DOCS } from "@/components/pages/elements/aui-element-docs";
import {
  GENERATIVE_USAGE,
  getGenerativeElement,
} from "@/lib/generative-elements";

type ListingEntry =
  | {
      type: "page";
      title: PageTree.Node["name"];
      url: string;
      description?: string;
    }
  | {
      type: "folder";
      name: PageTree.Node["name"];
      url?: string;
      description?: string;
    };

type Listing = ListingEntry[] | { error: string };

const ELEMENTS_FOLDER = {
  type: "folder" as const,
  name: "elements",
  url: "/elements",
  description:
    "The Elements catalog: ready-made chat UI components (thread, composer, model selector, citations, charts, and more), each with install and wiring notes.",
};

const EXAMPLES_FOLDER = {
  type: "folder" as const,
  name: "examples",
  description:
    "Examples of app types users can build with assistant-ui, showing instructions, recommended patterns, and UI structure.",
};

function normalizeSegment(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function descriptionOf(node: PageTree.Node) {
  return "description" in node && typeof node.description === "string"
    ? { description: node.description }
    : {};
}

function pageUrls(folder: PageTree.Folder): string[] {
  const urls: string[] = [];
  if (folder.index) urls.push(folder.index.url);
  for (const child of folder.children) {
    if (child.type === "page") urls.push(child.url);
    else if (child.type === "folder") urls.push(...pageUrls(child));
  }
  return urls;
}

// The URL directory every page under a folder shares at `depth`, such as
// "ai-sdk" for "AI SDK by Vercel". Group folders such as "Getting Started"
// add no URL segment, so their pages share none.
function sharedSegment(
  folder: PageTree.Folder,
  depth: number,
  baseUrl: string,
): string | undefined {
  const segments = pageUrls(folder).map(
    (url) => url.slice(baseUrl.length).split("/").filter(Boolean)[depth],
  );
  const first = segments[0];
  return first !== undefined && segments.every((s) => s === first)
    ? first
    : undefined;
}

function findFolderByPath(
  tree: PageTree.Root,
  path: string,
  baseUrl: string,
): PageTree.Folder | undefined {
  let currentFolder: PageTree.Folder | undefined;
  let children: PageTree.Node[] = tree.children;
  let depth = 0;

  for (const segment of path.split("/").filter(Boolean).map(normalizeSegment)) {
    const folder = children.find(
      (node): node is PageTree.Folder =>
        node.type === "folder" &&
        (normalizeSegment(typeof node.name === "string" ? node.name : "") ===
          segment ||
          sharedSegment(node, depth, baseUrl) === segment),
    );
    if (!folder) return undefined;
    if (sharedSegment(folder, depth, baseUrl) !== undefined) depth += 1;
    currentFolder = folder;
    children = folder.children;
  }

  return currentFolder;
}

function listChildren(nodes: PageTree.Node[]): ListingEntry[] {
  return nodes.flatMap((node) => {
    switch (node.type) {
      case "page":
        return {
          type: "page" as const,
          title: node.name,
          url: node.url,
          ...descriptionOf(node),
        };
      case "folder":
        return {
          type: "folder" as const,
          name: node.name,
          ...(node.index ? { url: node.index.url } : {}),
          ...descriptionOf(node),
        };
      default:
        return [];
    }
  });
}

// The catalog lists every element; only some have an MDX usage guide.
function listElements(): ListingEntry[] {
  return ELEMENTS.map((element) => {
    const page = elementsDocs.getPage([element.slug]);
    const description = page?.data.description ?? element.description;
    return {
      type: "page" as const,
      title: page?.data.title ?? element.title,
      url: `/elements/${element.slug}`,
      ...(description ? { description } : {}),
    };
  });
}

function allPages(nodes: PageTree.Node[]): PageTree.Item[] {
  return nodes.flatMap((node) => {
    if (node.type === "page") return [node];
    if (node.type === "folder")
      return [...(node.index ? [node.index] : []), ...allPages(node.children)];
    return [];
  });
}

export function listDocs(path: string | undefined): Listing {
  const cleaned = (path ?? "")
    .trim()
    .replace(/^\/+/, "")
    .replace(/^docs(\/|$)/, "")
    .replace(/\/+$/, "");

  if (!cleaned) {
    const root = listChildren(
      source.pageTree.children.filter(
        (node): node is PageTree.Folder => node.type === "folder",
      ),
    );
    return [...root, ELEMENTS_FOLDER, EXAMPLES_FOLDER];
  }

  const segments = cleaned.split("/").filter(Boolean);
  const head = normalizeSegment(segments[0] ?? "");

  if (head === "elements") {
    return segments.length === 1 ? listElements() : { error: "Path not found" };
  }

  if (head === "examples") {
    const rest = segments.slice(1).join("/");
    const target = rest
      ? findFolderByPath(examplesSource.pageTree, rest, "/examples")
      : examplesSource.pageTree;
    if (!target) return { error: "Path not found" };
    return listChildren(target.children);
  }

  const target = findFolderByPath(source.pageTree, cleaned, "/docs");
  if (target) return listChildren(target.children);

  // A meta.json "...folder" entry inlines a folder's pages into its parent, so
  // the tree has no folder for it; list the pages under that URL instead.
  const prefix = `/docs/${cleaned.toLowerCase()}`;
  const pages = allPages(source.pageTree.children).filter((page) =>
    page.url.startsWith(`${prefix}/`),
  );
  if (pages.length === 0) return { error: "Path not found" };
  return listChildren(pages);
}

export const DOCS_PATH_ERROR = "Only local docs paths are supported";

export function normalizeDocPath(slugOrUrl: string, routeUrl: string): string {
  const raw = slugOrUrl.trim();
  if (!raw) {
    throw new Error("Slug/path is required");
  }

  const current = new URL(routeUrl);
  const isAbsoluteUrl = /^https?:\/\//i.test(raw);

  if (!isAbsoluteUrl) {
    const cleaned = (raw.split(/[?#]/)[0] ?? "")
      .replace(/^\/+/, "")
      .replace(/^docs\//, "");
    if (!cleaned || cleaned.includes("..")) {
      throw new Error(DOCS_PATH_ERROR);
    }
    return cleaned;
  }

  const resolved = new URL(raw);
  if (resolved.origin !== current.origin) {
    throw new Error(DOCS_PATH_ERROR);
  }

  const cleaned = resolved.pathname.replace(/^\/+/, "").replace(/^docs\//, "");
  if (!cleaned || cleaned.includes("..")) {
    throw new Error(DOCS_PATH_ERROR);
  }

  return cleaned;
}

export function resolveDocPage(slugs: string[]) {
  const [head, ...rest] = slugs;
  if (head === "examples") return examplesSource.getPage(rest);
  if (head === "elements" && rest.length > 0) return elementsDocs.getPage(rest);
  if (head === "design") return design.getPage(rest);
  const path = slugs.join("/");
  return resolveDocsUrl(`/${path}`) ?? resolveDocsUrl(`/docs/${path}`);
}

// What the element's catalog page shows: install command, usage, props, or the generative spec.
function catalogElementText(element: FlatElement): string {
  const url = `/elements/${element.slug}`;
  const lines = [
    `# ${element.title}`,
    `URL: ${url}`,
    "",
    element.description,
    "",
    "## Installation",
    "",
    "```bash",
    `npx shadcn@latest add "@assistant-ui/${elementRegistryName(element)}"`,
    "```",
  ];
  const generative = element.generative
    ? getGenerativeElement(element.slug)
    : undefined;
  if (generative) {
    lines.push("", "## Usage", "", "```tsx", GENERATIVE_USAGE, "```");
    lines.push(
      "",
      "## Spec",
      "",
      "```json",
      JSON.stringify(generative.template.tree, null, 2),
      "```",
    );
  }
  const doc = AUI_ELEMENT_DOCS[element.slug];
  if (doc) {
    lines.push("", "## Usage", "", "```tsx", doc.usage, "```");
    for (const table of doc.props) {
      lines.push("", `## ${table.component} props`, "");
      lines.push(
        "| Prop | Type | Default | Description |",
        "|---|---|---|---|",
      );
      for (const row of table.rows) {
        const name = `\`${row.name}\`${row.required ? " (required)" : ""}`;
        const type = `\`${row.type.replaceAll("|", "\\|")}\``;
        const fallback = row.defaultValue ? `\`${row.defaultValue}\`` : "";
        lines.push(`| ${name} | ${type} | ${fallback} | ${row.description} |`);
      }
    }
  }
  return lines.join("\n");
}

export async function readDoc(slugOrUrl: string, routeUrl: string) {
  let normalized: string;
  try {
    normalized = normalizeDocPath(slugOrUrl, routeUrl);
  } catch (error) {
    return {
      error: error instanceof Error ? error.message : "Invalid docs path",
    };
  }

  const slugs = normalized.split("/").filter(Boolean);
  const page = resolveDocPage(slugs);
  if (page) {
    return {
      title: page.data.title,
      url: page.url,
      content: await getLLMText(page),
    };
  }

  // Catalog elements without an MDX guide still have a page on the site.
  const element =
    slugs[0] === "elements" && slugs.length === 2
      ? getElement(slugs[1] ?? "")
      : undefined;
  if (element) {
    return {
      title: element.title,
      url: `/elements/${element.slug}`,
      content: catalogElementText(element),
    };
  }

  return { error: `Page not found: ${slugOrUrl}` };
}
