export type BlockFile = {
  type:
    | "registry:page"
    | "registry:component"
    | "registry:hook"
    | "registry:lib"
    | "registry:file";
  /** Where the file lands in the project that installs the block. */
  path: string;
  /** Location inside the block directory, when it differs from `path`. */
  source?: string;
};

export type BlockEntry = {
  slug: string;
  title: string;
  description: string;
  files: BlockFile[];
  dependencies: string[];
  registryDependencies: string[];
  /** Shown by the shadcn CLI once the block is installed. */
  docs?: string;
};

export const blockRegistryName = (slug: string) => `blocks-${slug}`;

/** A block file's source, relative to the registry app. */
export const blockSourcePath = (slug: string, file: BlockFile) =>
  `blocks/${slug}/${file.source ?? file.path}`;

export const BLOCKS: BlockEntry[] = [
  {
    slug: "agent-document-editor",
    title: "Agent document editor",
    description:
      "A rich text document beside an assistant thread. The assistant reads and edits the document with tools, and each of its changes is one undo step.",
    files: [
      { type: "registry:page", path: "app/document-editor/page.tsx" },
      { type: "registry:page", path: "app/document-editor/layout.tsx" },
      { type: "registry:page", path: "app/api/document-editor/route.ts" },
      {
        type: "registry:component",
        path: "components/document-editor/document-editor.tsx",
      },
      {
        type: "registry:component",
        path: "components/document-editor/document-workspace.tsx",
      },
      {
        type: "registry:component",
        path: "components/document-editor/document-pane.tsx",
      },
      {
        type: "registry:component",
        path: "components/document-editor/document-toolbar.tsx",
      },
      { type: "registry:hook", path: "hooks/use-document.ts" },
      { type: "registry:lib", path: "lib/document-editor/document.ts" },
      { type: "registry:lib", path: "lib/document-editor/document-store.ts" },
      { type: "registry:lib", path: "lib/document-editor/document-sync.ts" },
      {
        type: "registry:lib",
        path: "lib/document-editor/document-toolkit.ts",
      },
      { type: "registry:lib", path: "lib/document-editor/markdown.ts" },
      { type: "registry:lib", path: "lib/document-editor/prompts.ts" },
      {
        type: "registry:file",
        path: "components/document-editor/README.md",
        source: "README.md",
      },
    ],
    dependencies: [
      "@assistant-ui/react",
      "@assistant-ui/ai-sdk",
      "ai",
      "@ai-sdk/openai",
      "lexical",
      "@lexical/link",
      "@lexical/list",
      "@lexical/markdown",
      "@lexical/react",
      "@lexical/rich-text",
      "@lexical/selection",
      "lucide-react",
      "zod",
      "zustand",
    ],
    registryDependencies: [
      "button",
      "resizable",
      "https://r.assistant-ui.com/thread.json",
      "https://r.assistant-ui.com/tooltip-icon-button.json",
      "https://r.assistant-ui.com/use-copy-to-clipboard.json",
    ],
    docs: "Add OPENAI_API_KEY to .env.local, then open /document-editor. components/document-editor/README.md describes each file.",
  },
];
