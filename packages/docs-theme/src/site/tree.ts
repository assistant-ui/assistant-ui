import type { ReactNode } from "react";

interface DocsNodeBase {
  $id?: string;
  name?: ReactNode;
  icon?: ReactNode;
}
export interface DocsPage extends DocsNodeBase {
  type: "page";
  name: ReactNode;
  url: string;
}
export interface DocsFolder extends DocsNodeBase {
  type: "folder";
  name: ReactNode;
  index?: DocsPage;
  children: DocsNode[];
}
export interface DocsSeparator extends DocsNodeBase {
  type: "separator";
}
export type DocsNode = DocsPage | DocsFolder | DocsSeparator;

export function findActivePath(
  nodes: readonly DocsNode[],
  pathname: string,
): DocsNode[] | null {
  for (const node of nodes) {
    if (node.type === "page" && node.url === pathname) return [node];
    if (node.type !== "folder") continue;
    if (node.index?.url === pathname) return [node, node.index];
    const path = findActivePath(node.children, pathname);
    if (path) return [node, ...path];
  }
  return null;
}
