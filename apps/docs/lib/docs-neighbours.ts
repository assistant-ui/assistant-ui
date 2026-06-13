import type { Node, Root } from "fumadocs-core/page-tree";
import type { ReactNode } from "react";

export type DocsNeighbour = {
  name: ReactNode;
  url: string;
  section?: ReactNode;
};

type Section = { id: string; name: ReactNode } | undefined;
type FlatPage = { name: ReactNode; url: string; section: Section };

/* fumadocs findNeighbour stops at root:true folder boundaries, so the last page of a section has no next. Flatten every section into one ordered list so navigation continues across sections, tagging each page with the section it belongs to. */
function flatten(tree: Root): FlatPage[] {
  const pages: FlatPage[] = [];
  let rootCount = 0;
  const walk = (nodes: Node[], section: Section) => {
    for (const node of nodes) {
      if (node.type === "page") {
        pages.push({ name: node.name, url: node.url, section });
      } else if (node.type === "folder") {
        const childSection: Section = node.root
          ? { id: `root-${rootCount++}`, name: node.name }
          : section;
        if (node.index) {
          pages.push({
            name: node.index.name,
            url: node.index.url,
            section: childSection,
          });
        }
        walk(node.children, childSection);
      }
    }
  };
  walk(tree.children, undefined);
  return pages;
}

export function getDocsNeighbours(
  tree: Root,
  url: string,
): { previous?: DocsNeighbour | undefined; next?: DocsNeighbour | undefined } {
  const pages = flatten(tree);
  const index = pages.findIndex((page) => page.url === url);
  if (index === -1) return {};
  const current = pages[index]!;

  const toNeighbour = (
    page: FlatPage | undefined,
  ): DocsNeighbour | undefined => {
    if (!page) return undefined;
    const crossesSection =
      page.section != null && page.section.id !== current.section?.id;
    return {
      name: page.name,
      url: page.url,
      ...(crossesSection ? { section: page.section!.name } : {}),
    };
  };

  return {
    previous: toNeighbour(pages[index - 1]),
    next: toNeighbour(pages[index + 1]),
  };
}
