import { getLLMText } from "@/lib/get-llm-text";
import { source, examples as examplesSource } from "@/lib/source";
import { tool, zodSchema } from "ai";
import type * as PageTree from "fumadocs-core/page-tree";
import z from "zod";

const DOCS_PATH_ERROR = "Only local docs paths are supported";

function normalizeSegment(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "-");
}

function findFolderByPath(
  tree: PageTree.Root,
  path: string,
): PageTree.Folder | undefined {
  const segments = path.split("/").filter(Boolean);
  let currentFolder: PageTree.Folder | undefined;
  let children: PageTree.Node[] = tree.children;

  for (const segment of segments) {
    const folder = children.find(
      (node): node is PageTree.Folder =>
        node.type === "folder" &&
        normalizeSegment(typeof node.name === "string" ? node.name : "") ===
          normalizeSegment(segment),
    );
    if (!folder) return undefined;
    currentFolder = folder;
    children = folder.children;
  }

  return currentFolder;
}

function normalizeDocPath(slugOrUrl: string, routeUrl: string): string {
  const raw = slugOrUrl.trim();
  if (!raw) {
    throw new Error("Slug/path is required");
  }

  const current = new URL(routeUrl);
  const isAbsoluteUrl = /^https?:\/\//i.test(raw);

  if (!isAbsoluteUrl) {
    const cleaned = raw.replace(/^\/+/, "").replace(/^docs\//, "");
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

function descriptionFromNode(node: PageTree.Node) {
  const description = (node as { description?: unknown }).description;
  return typeof description === "string" && description.trim()
    ? { description }
    : {};
}

const flatNodes = (nodes: PageTree.Node[]) =>
  nodes.flatMap((node) => {
    switch (node.type) {
      case "page":
        return {
          type: "page",
          title: node.name,
          url: node.url,
          ...descriptionFromNode(node),
        };
      case "folder":
        return {
          type: "folder",
          name: node.name,
          ...(node.index ? { url: node.index.url } : {}),
          ...descriptionFromNode(node),
        };
      default:
        return [];
    }
  });

export function createDocsTools({ routeUrl }: { routeUrl: string }) {
  return {
    listDocs: tool({
      description:
        "List documentation pages. Use with no path for root categories, or specify path to browse a section.",
      inputSchema: zodSchema(
        z.object({
          path: z
            .string()
            .optional()
            .describe(
              "Subpath to browse. Omit to list root categories first.",
            ),
        }),
      ),
      execute: async ({ path }) => {
        const pageTree = source.pageTree;

        if (!path) {
          return [
            ...flatNodes(
              pageTree.children.filter(
                (node): node is PageTree.Folder => node.type === "folder",
              ),
            ),
            { type: "folder", name: "examples", url: "/examples" },
          ];
        }

        const segments = path.split("/").filter(Boolean);
        if (segments[0] === "examples") {
          const rest = segments.slice(1).join("/");
          const target = rest
            ? findFolderByPath(examplesSource.pageTree, rest)
            : examplesSource.pageTree;
          if (!target) return { error: "Path not found" };
          return flatNodes(target.children);
        }

        const targetFolder = findFolderByPath(pageTree, path);
        if (!targetFolder) return { error: "Path not found" };
        return flatNodes(targetFolder.children);
      },
    }),
    readDoc: tool({
      description: "Read full content of a documentation page.",
      inputSchema: zodSchema(
        z.object({
          slugOrUrl: z
            .string()
            .describe(
              "Page slug (e.g., 'examples/ai-sdk', 'ui/thread') or URL",
            ),
        }),
      ),
      execute: async ({ slugOrUrl }) => {
        let normalized: string;
        try {
          normalized = normalizeDocPath(slugOrUrl, routeUrl);
        } catch (error) {
          return {
            error: error instanceof Error ? error.message : "Invalid docs path",
          };
        }

        const slugs = normalized.split("/").filter(Boolean);
        const isExample = slugs[0] === "examples";
        const docSource = isExample ? examplesSource : source;
        const docSlugs = isExample ? slugs.slice(1) : slugs;

        const page = docSource.getPage(docSlugs);
        if (!page) return { error: `Page not found: ${slugOrUrl}` };
        const content = await getLLMText(page);
        return { title: page.data.title, url: page.url, content };
      },
    }),
  };
}

