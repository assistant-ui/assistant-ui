import type { ReactNode } from "react";
import type { useTreeContext } from "fumadocs-ui/contexts/tree";

export const getPageNeighbors = (
  nodes: ReturnType<typeof useTreeContext>["root"]["children"],
  pathname: string,
) => {
  const pages: getPageNeighbors.Link[] = [];
  const visit = (items: typeof nodes, section?: ReactNode) => {
    for (const node of items) {
      if (node.type === "page")
        pages.push({ name: node.name, url: node.url, section });
      if (node.type === "folder") {
        if (node.index)
          pages.push({ name: node.index.name, url: node.index.url });
        visit(node.children, node.name);
      }
    }
  };
  visit(nodes);
  const index = pages.findIndex(
    (page) => page.url === pathname.replace(/\/$/, ""),
  );
  return {
    current: pages[index],
    previous: index >= 0 ? pages[index - 1] : undefined,
    next: index >= 0 ? pages[index + 1] : undefined,
  };
};

export namespace getPageNeighbors {
  export interface Link {
    name: ReactNode;
    url: string;
    section?: ReactNode;
  }
}

export const getEditUrl = (pathname: string, github?: getEditUrl.Options) => {
  if (!github) return undefined;
  const base = typeof github === "string" ? { url: github } : github;
  const directory = base.directory?.replace(/^\/+|\/+$/g, "");
  return `${base.url.replace(/\/$/, "")}/edit/${base.branch ?? "main"}/${directory ? `${directory}/` : ""}app${pathname.replace(/\/$/, "")}/page.mdx`;
};

export namespace getEditUrl {
  export type Options =
    | string
    | {
        url: string;
        branch?: string;
        directory?: string;
      };
}
