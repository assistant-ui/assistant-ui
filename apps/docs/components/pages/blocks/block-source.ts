import { cacheLife } from "next/cache";
import { promises as fs } from "node:fs";
import path from "node:path";
import type { BlockSource } from "@/lib/blocks";

export type BlockFile = {
  path: string;
  code: string;
};

export type BlockDependency = {
  name: string;
  range: string;
};

export type BlockImportKind =
  | "hook"
  | "primitive"
  | "component"
  | "runtime"
  | "type";

export type BlockImport = {
  name: string;
  source: string;
  kind: BlockImportKind;
  /** Members read off the import, as in `ThreadPrimitive.Root`. */
  parts: string[];
  files: string[];
};

const ASSISTANT_UI_IMPORT =
  /import\s+(type\s+)?\{([^}]*)\}\s*from\s*"(@assistant-ui\/[^"]+|@\/components\/assistant-ui\/[^"]+)"/g;

const SOURCE_FILE = /\.(?:[cm]?[jt]sx?|json|css|mdx?)$/;
const ENV_FILE = /^\.env(?:\.|$)/;
const ENV_TEMPLATE = ".env.example";

export async function readBlockSource(
  source: BlockSource,
): Promise<BlockFile[]> {
  "use cache";
  cacheLife("max");
  // Routes that read these files list them in `outputFileTracingIncludes`.
  return readBlockFiles(
    path.join(
      /* turbopackIgnore: true */ process.cwd(),
      "..",
      "..",
      source.directory,
    ),
    source.include,
  );
}

export async function readBlockFiles(
  root: string,
  include: readonly string[],
): Promise<BlockFile[]> {
  const filePaths = (
    await Promise.all(
      include.map(async (entry) => {
        const stats = await fs.stat(path.join(root, entry));
        return stats.isDirectory() ? listSourceFiles(root, entry) : [entry];
      }),
    )
  )
    .flat()
    .filter(
      (filePath) =>
        !ENV_FILE.test(path.basename(filePath)) ||
        path.basename(filePath) === ENV_TEMPLATE,
    )
    .sort();

  return Promise.all(
    filePaths.map(async (filePath) => ({
      path: filePath,
      code: (await fs.readFile(path.join(root, filePath), "utf8")).trimEnd(),
    })),
  );
}

async function listSourceFiles(
  root: string,
  directory: string,
): Promise<string[]> {
  const entries = await fs.readdir(path.join(root, directory), {
    withFileTypes: true,
  });
  const nested = await Promise.all(
    entries.map(async (entry) => {
      if (entry.name.startsWith(".") || entry.name === "node_modules")
        return [];
      const entryPath = `${directory}/${entry.name}`;
      if (entry.isDirectory()) return listSourceFiles(root, entryPath);
      return entry.isFile() && SOURCE_FILE.test(entry.name) ? [entryPath] : [];
    }),
  );
  return nested.flat();
}

const PACKAGE_IMPORT =
  /from\s+"((?:@[a-z0-9][\w.-]*\/)?[a-z0-9][\w.-]*)(?:\/[^"]*)?"/g;
const TEST_FILE = /\.(?:test|spec)\.[cm]?[jt]sx?$/;

const ELEMENT_IMPORT = /components\/assistant-ui\/elements\/([A-Za-z0-9._-]+)/g;

/**
 * A primitive the element is built on. A match means the block renders that
 * primitive, which is not the same as importing the element.
 */
const ELEMENT_MARKERS: readonly {
  slug: string;
  name: string;
  pattern: RegExp;
}[] = [
  {
    slug: "message-pair",
    name: "MessagePrimitive",
    pattern: /\bMessagePrimitive\b/,
  },
  {
    slug: "message-branches",
    name: "BranchPickerPrimitive",
    pattern: /\bBranchPickerPrimitive\b/,
  },
  {
    slug: "message-actions",
    name: "ActionBarPrimitive",
    pattern: /\bActionBarPrimitive\b/,
  },
  {
    slug: "error-state",
    name: "ErrorPrimitive",
    pattern: /\bErrorPrimitive\b/,
  },
  {
    slug: "message-queue",
    name: "QueueItemPrimitive",
    pattern: /\bQueueItemPrimitive\b/,
  },
  {
    slug: "message-queue",
    name: "ComposerPrimitive.Queue",
    pattern: /\bComposerPrimitive\.Queue\b/,
  },
  {
    slug: "edit-message",
    name: "ActionBarPrimitive.Edit",
    pattern: /\bActionBarPrimitive\.Edit\b/,
  },
  {
    slug: "regenerate-menu",
    name: "ActionBarPrimitive.Reload",
    pattern: /\bActionBarPrimitive\.Reload\b/,
  },
  {
    slug: "read-aloud",
    name: "ActionBarPrimitive.Speak",
    pattern: /\bActionBarPrimitive\.Speak\b/,
  },
  {
    slug: "read-aloud",
    name: "WebSpeechSynthesisAdapter",
    pattern: /\bWebSpeechSynthesisAdapter\b/,
  },
  {
    slug: "composer",
    name: "ComposerPrimitive",
    pattern: /\bComposerPrimitive\b/,
  },
  {
    slug: "composer-attachments",
    name: "ComposerPrimitive.AddAttachment",
    pattern: /\bComposerPrimitive\.AddAttachment\b/,
  },
  {
    slug: "composer-attachments",
    name: "ComposerPrimitive.Attachments",
    pattern: /\bComposerPrimitive\.Attachments\b/,
  },
  {
    slug: "composer-attachments",
    name: "ComposerPrimitive.AttachmentDropzone",
    pattern: /\bComposerPrimitive\.AttachmentDropzone\b/,
  },
  {
    slug: "composer-voice",
    name: "ComposerPrimitive.Dictate",
    pattern: /\bComposerPrimitive\.Dictate\b/,
  },
  {
    slug: "composer-voice",
    name: "WebSpeechDictationAdapter",
    pattern: /\bWebSpeechDictationAdapter\b/,
  },
  {
    slug: "scroll-anchor",
    name: "ThreadPrimitive.ScrollToBottom",
    pattern: /\bThreadPrimitive\.ScrollToBottom\b/,
  },
  {
    slug: "empty-state",
    name: "ThreadPrimitive.Suggestions",
    pattern: /\bThreadPrimitive\.Suggestions\b/,
  },
  { slug: "thread", name: "ThreadPrimitive", pattern: /\bThreadPrimitive\b/ },
  {
    slug: "assistant-modal",
    name: "AssistantModalPrimitive",
    pattern: /\bAssistantModalPrimitive\b/,
  },
  {
    slug: "thread-list",
    name: "ThreadListPrimitive",
    pattern: /\bThreadListPrimitive\b/,
  },
  {
    slug: "follow-up-suggestions",
    name: "SuggestionPrimitive",
    pattern: /\bSuggestionPrimitive\b/,
  },
  {
    slug: "follow-up-suggestions",
    name: "ThreadPrimitive.Suggestion",
    pattern: /\bThreadPrimitive\.Suggestion\b/,
  },
  {
    slug: "reasoning",
    name: "ChainOfThoughtPrimitive",
    pattern: /\bChainOfThoughtPrimitive\b/,
  },
  {
    slug: "attachment",
    name: "AttachmentPrimitive",
    pattern: /\bAttachmentPrimitive\b/,
  },
  {
    slug: "quote",
    name: "SelectionToolbarPrimitive",
    pattern: /\bSelectionToolbarPrimitive\b/,
  },
  {
    slug: "quote",
    name: "ComposerPrimitive.Quote",
    pattern: /\bComposerPrimitive\.Quote\b/,
  },
  {
    slug: "quote",
    name: "MessagePrimitive.Quote",
    pattern: /\bMessagePrimitive\.Quote\b/,
  },
  {
    slug: "markdown-text",
    name: "MarkdownTextPrimitive",
    pattern: /\bMarkdownTextPrimitive\b/,
  },
  {
    slug: "image",
    name: "MessagePartPrimitive.Image",
    pattern: /\bMessagePartPrimitive\.Image\b/,
  },
  {
    slug: "composer-trigger-popover",
    name: "ComposerPrimitive.TriggerPopover",
    pattern: /\bComposerPrimitive\.TriggerPopover\b/,
  },
  {
    slug: "generative-ui",
    name: "MessagePrimitive.GenerativeUI",
    pattern: /\bMessagePrimitive\.GenerativeUI\b/,
  },
  {
    slug: "generative-ui",
    name: "GenerativeUIComponentRegistry",
    pattern: /\bGenerativeUIComponentRegistry\b/,
  },
];

export type ElementCatalogEntry = {
  slug: string;
  file?: string;
};

export type BlockElementUse = {
  slug: string;
  /** `element` imports the catalog component. `primitive` renders the primitive it is built on. */
  kind: "element" | "primitive";
  /** The imported file, or the primitives the block renders. */
  names: readonly string[];
};

function remember(map: Map<string, string[]>, slug: string, name: string) {
  const names = map.get(slug) ?? [];
  if (!names.includes(name)) names.push(name);
  map.set(slug, names);
}

/** Catalog entries a block renders, in catalog order. An imported element is not also listed as its primitive. */
export function blockElements(
  files: readonly BlockFile[],
  catalog: readonly ElementCatalogEntry[],
): BlockElementUse[] {
  const imported = new Map<string, string[]>();
  const primitives = new Map<string, string[]>();
  const byFile = new Map(
    catalog.flatMap((entry) =>
      entry.file
        ? [[entry.file.replace(/\.tsx$/, ""), entry.slug] as const]
        : [],
    ),
  );

  for (const file of files) {
    if (TEST_FILE.test(file.path)) continue;
    for (const marker of ELEMENT_MARKERS) {
      if (marker.pattern.test(file.code))
        remember(primitives, marker.slug, marker.name);
    }
    for (const [, fileName = ""] of file.code.matchAll(ELEMENT_IMPORT)) {
      const stem = fileName.replace(/\.tsx$/, "");
      const slug = byFile.get(stem);
      if (slug) remember(imported, slug, stem);
    }
  }

  return catalog.flatMap((entry): BlockElementUse[] => {
    const element = imported.get(entry.slug);
    if (element) return [{ slug: entry.slug, kind: "element", names: element }];
    const names = primitives.get(entry.slug);
    if (!names) return [];
    return [{ slug: entry.slug, kind: "primitive", names }];
  });
}

/**
 * A block's runtime dependencies, from its manifest. A block without one, a
 * demo inside the docs app, lists the packages its files import, at the
 * version ranges of `ranges`.
 */
export function blockDependencies(
  files: readonly BlockFile[],
  ranges: Readonly<Record<string, string>> = {},
): BlockDependency[] {
  const manifest = files.find((file) => file.path === "package.json");
  if (!manifest) {
    const names = new Set(
      files
        .filter((file) => !TEST_FILE.test(file.path))
        .flatMap((file) =>
          [...file.code.matchAll(PACKAGE_IMPORT)].map(([, name = ""]) => name),
        ),
    );
    return [...names]
      .sort()
      .map((name) => ({ name, range: ranges[name] ?? "" }));
  }
  const { dependencies = {} } = JSON.parse(manifest.code) as {
    dependencies?: Record<string, string>;
  };
  return Object.entries(dependencies).map(([name, range]) => ({ name, range }));
}

export async function readPublishedDependencies(
  dependencies: readonly BlockDependency[],
): Promise<BlockDependency[]> {
  "use cache";
  cacheLife("max");
  return publishedDependencies(
    dependencies,
    path.join(/* turbopackIgnore: true */ process.cwd(), "node_modules"),
  );
}

/**
 * Swaps each `workspace:` range, which installs only inside this monorepo,
 * for a caret range on the version the package's manifest under `modulesRoot`
 * publishes.
 */
export async function publishedDependencies(
  dependencies: readonly BlockDependency[],
  modulesRoot: string,
): Promise<BlockDependency[]> {
  return Promise.all(
    dependencies.map(async (dependency) => {
      if (!dependency.range.startsWith("workspace:")) return dependency;
      const { version } = JSON.parse(
        await fs.readFile(
          path.join(modulesRoot, dependency.name, "package.json"),
          "utf8",
        ),
      ) as { version: string };
      return { ...dependency, range: `^${version}` };
    }),
  );
}

function importKind(name: string, source: string): BlockImportKind {
  if (source.startsWith("@/")) return "component";
  if (/^(?:unstable_)?use[A-Z]/.test(name)) return "hook";
  if (name.endsWith("Primitive")) return "primitive";
  return "runtime";
}

export function blockAssistantUi(files: readonly BlockFile[]): BlockImport[] {
  const found = new Map<string, BlockImport>();

  for (const file of files) {
    for (const [, typeImport, names = "", source = ""] of file.code.matchAll(
      ASSISTANT_UI_IMPORT,
    )) {
      for (const specifier of names.split(",")) {
        const typeOnly = Boolean(typeImport) || /^\s*type\s/.test(specifier);
        const [name = "", local = name] = specifier
          .trim()
          .replace(/^type\s+/, "")
          .split(/\s+as\s+/);
        if (!name) continue;

        const key = `${source} ${name}`;
        const entry: BlockImport = found.get(key) ?? {
          name,
          source,
          kind: "type",
          parts: [],
          files: [],
        };
        if (!typeOnly) entry.kind = importKind(name, source);
        if (!entry.files.includes(file.path)) entry.files.push(file.path);
        for (const [, part = ""] of file.code.matchAll(
          new RegExp(`<${local}\\.([A-Z]\\w*)`, "g"),
        )) {
          if (!entry.parts.includes(part)) entry.parts.push(part);
        }
        found.set(key, entry);
      }
    }
  }

  return [...found.values()].sort(
    (a, b) => a.source.localeCompare(b.source) || a.name.localeCompare(b.name),
  );
}
