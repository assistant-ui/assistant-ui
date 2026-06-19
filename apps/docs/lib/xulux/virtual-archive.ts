import { unzipSync } from "fflate";

export type FileEntry = {
  path: string;
  name: string;
  size: number;
  isText: boolean;
};

export type FileTreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  size?: number;
  children?: FileTreeNode[];
};

export type VirtualArchive = {
  entries: FileEntry[];
  tree: FileTreeNode[];
  fileCount: number;
  totalBytes: number;
  readText(path: string): string | null;
  isText(path: string): boolean;
};

const TEXT_EXTENSIONS = new Set([
  "ts",
  "tsx",
  "js",
  "jsx",
  "mjs",
  "cjs",
  "json",
  "md",
  "mdx",
  "txt",
  "yml",
  "yaml",
  "css",
  "scss",
  "html",
  "xml",
  "svg",
  "env",
  "example",
  "gitignore",
  "mts",
  "cts",
  "toml",
]);

function isTextFile(name: string): boolean {
  if (name.startsWith(".")) return true;
  const ext = name.includes(".") ? name.split(".").pop()!.toLowerCase() : "";
  return TEXT_EXTENSIONS.has(ext);
}

export function createVirtualArchive(zipBytes: Uint8Array): VirtualArchive {
  const unzipped = unzipSync(zipBytes);
  const decoder = new TextDecoder();

  const fileMap = new Map<string, Uint8Array>();
  const entries: FileEntry[] = [];

  for (const [rawPath, data] of Object.entries(unzipped)) {
    const path = rawPath.replace(/^\/+/, "");
    if (path.endsWith("/") || data.length === 0) continue;
    const name = path.split("/").pop()!;
    const text = isTextFile(name);
    fileMap.set(path, data);
    entries.push({ path, name, size: data.length, isText: text });
  }

  entries.sort((a, b) => a.path.localeCompare(b.path));

  return {
    entries,
    tree: buildTree(entries),
    fileCount: entries.length,
    totalBytes: entries.reduce((sum, e) => sum + e.size, 0),
    readText(path: string) {
      const data = fileMap.get(path);
      if (!data) return null;
      return decoder.decode(data);
    },
    isText(path: string) {
      return entries.find((e) => e.path === path)?.isText ?? false;
    },
  };
}

function buildTree(entries: FileEntry[]): FileTreeNode[] {
  const root: FileTreeNode = {
    name: "",
    path: "",
    type: "directory",
    children: [],
  };

  for (const entry of entries) {
    const parts = entry.path.split("/");
    let current = root;
    let currentPath = "";

    for (let i = 0; i < parts.length; i++) {
      const part = parts[i]!;
      currentPath = currentPath ? `${currentPath}/${part}` : part;

      if (i === parts.length - 1) {
        current.children!.push({
          name: part,
          path: currentPath,
          type: "file",
          size: entry.size,
        });
      } else {
        let dir = current.children!.find(
          (c) => c.type === "directory" && c.name === part,
        );
        if (!dir) {
          dir = {
            name: part,
            path: currentPath,
            type: "directory",
            children: [],
          };
          current.children!.push(dir);
        }
        current = dir;
      }
    }
  }

  sortChildren(root);
  return root.children ?? [];
}

function sortChildren(node: FileTreeNode) {
  if (!node.children) return;
  node.children.sort((a, b) => {
    if (a.type !== b.type) return a.type === "directory" ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  node.children.forEach(sortChildren);
}
