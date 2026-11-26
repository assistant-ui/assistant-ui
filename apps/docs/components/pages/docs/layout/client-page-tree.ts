import type * as PageTree from "fumadocs-core/page-tree";

type Node = PageTree.Node;

function withPlatforms<T extends object>(source: Node, target: T): T {
  const platforms = (source as { platforms?: readonly string[] }).platforms;
  if (platforms)
    (target as { platforms?: readonly string[] }).platforms = platforms;
  return target;
}

type Ids = { next: number };

function clientPage(page: PageTree.Item, ids: Ids): PageTree.Item {
  // The sidebar keys each node by its id; a short one does that job.
  const out: PageTree.Item = {
    $id: `p${(ids.next++).toString(36)}`,
    type: "page",
    name: page.name,
    url: page.url,
  };
  if (page.icon !== undefined) out.icon = page.icon;
  if (page.external !== undefined) out.external = page.external;
  return withPlatforms(page, out);
}

function clientNode(node: Node, ids: Ids): Node {
  if (node.type === "page") return clientPage(node, ids);
  if (node.type === "separator") {
    const out: PageTree.Separator = { type: "separator" };
    if (node.$id !== undefined) out.$id = node.$id;
    if (node.name !== undefined) out.name = node.name;
    if (node.icon !== undefined) out.icon = node.icon;
    return withPlatforms(node, out);
  }
  const out: PageTree.Folder = {
    type: "folder",
    name: node.name,
    children: node.children.map((child) => clientNode(child, ids)),
  };
  if (node.$id !== undefined) out.$id = node.$id;
  if (node.icon !== undefined) out.icon = node.icon;
  if (node.index !== undefined) out.index = clientPage(node.index, ids);
  if (node.root !== undefined) out.root = node.root;
  return withPlatforms(node, out);
}

// The sidebar, header and platform switcher read the page tree in the browser,
// so the layout sends it in the flight data of every docs page. Only the fields
// they read go there. Page descriptions, file references and the fumadocs
// folder flags stay on the server, and page ids (full file paths) become short
// keys: together they were about two thirds of the tree's 136 KB. Folder and
// separator ids stay, because the sidebar opens sections by id.
export function toClientPageTree(tree: PageTree.Root): PageTree.Root {
  const ids: Ids = { next: 0 };
  const out: PageTree.Root = {
    name: tree.name,
    children: tree.children.map((child) => clientNode(child, ids)),
  };
  if (tree.$id !== undefined) out.$id = tree.$id;
  return out;
}
