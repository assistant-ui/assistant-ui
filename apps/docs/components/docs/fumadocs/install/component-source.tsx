import fs from "node:fs/promises";
import path from "node:path";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { CodeCollapsible } from "@/components/docs/fumadocs/code-collapsible";

type RegistryFile = {
  content: string;
  type: string;
  path: string;
  target?: string;
};

type RegistryItem = {
  name: string;
  type: string;
  files: RegistryFile[];
  dependencies?: string[];
  registryDependencies?: string[];
};

export type ResolvedFile = {
  name: string;
  path: string;
  content: string;
};

export type ResolvedGroup = {
  files: ResolvedFile[];
  dependencies: string[];
};

export type ResolvedComponents = {
  main: ResolvedGroup;
  auiDeps: ResolvedGroup;
  shadcn: ResolvedGroup;
};

export type RegistryFlavor = "radix" | "base";

const RADIX_IMPORT = /(?:from|import)\s*\(?\s*["'](?:radix-ui["']|@radix-ui\/)/;

async function readFile(filePath: string): Promise<string | null> {
  try {
    return await fs.readFile(filePath, "utf-8");
  } catch {
    return null;
  }
}

async function readLocalRegistry(
  name: string,
  flavor: RegistryFlavor,
): Promise<RegistryItem | null> {
  const localPath = path.join(
    process.cwd(),
    "../registry/dist",
    flavor === "base" ? "base" : ".",
    `${name}.json`,
  );

  try {
    const content = await fs.readFile(localPath, "utf-8");
    return JSON.parse(content) as RegistryItem;
  } catch {
    return null;
  }
}

async function readLocalShadcnComponent(
  name: string,
  flavor: RegistryFlavor,
): Promise<string | null> {
  const uiPath = path.join(
    process.cwd(),
    "../../packages/ui/src/components/ui",
    `${name}.tsx`,
  );

  if (flavor === "base") {
    const vendoredPath = path.join(
      process.cwd(),
      "../../packages/ui/src/components/ui-base",
      `${name}.tsx`,
    );
    const vendoredContent = await readFile(vendoredPath);
    if (vendoredContent !== null) {
      return vendoredContent.replaceAll(
        "@/components/ui-base/",
        "@/components/ui/",
      );
    }

    const fallbackContent = await readFile(uiPath);
    return fallbackContent !== null && !RADIX_IMPORT.test(fallbackContent)
      ? fallbackContent
      : null;
  }

  return readFile(uiPath);
}

function parseRegistryDependency(dep: string): {
  source: "assistant-ui" | "shadcn";
  name: string;
} {
  if (dep.startsWith("https://r.assistant-ui.com/")) {
    return {
      source: "assistant-ui",
      name: dep
        .replace("https://r.assistant-ui.com/", "")
        .replace(/^base\//, "")
        .replace(".json", ""),
    };
  }
  return { source: "shadcn", name: dep };
}

const PRIMITIVE_BACKED_SHADCN = new Set([
  "button",
  "tooltip",
  "collapsible",
  "dialog",
  "popover",
  "dropdown-menu",
  "avatar",
  "select",
  "separator",
  "tabs",
  "toggle",
  "toggle-group",
  "checkbox",
  "label",
  "progress",
  "slider",
  "switch",
  "scroll-area",
  "context-menu",
  "alert-dialog",
  "hover-card",
  "menubar",
  "navigation-menu",
  "radio-group",
  "accordion",
  "aspect-ratio",
  "sidebar",
]);

const NEUTRAL_SHADCN_DEPENDENCIES: Record<string, string[]> = {
  form: ["react-hook-form", "@hookform/resolvers", "zod"],
  resizable: ["react-resizable-panels"],
  sonner: ["sonner"],
  drawer: ["vaul"],
  carousel: ["embla-carousel-react"],
  "input-otp": ["input-otp"],
};

function shadcnDependencies(
  name: string,
  flavor: RegistryFlavor,
): string[] | undefined {
  if (PRIMITIVE_BACKED_SHADCN.has(name)) {
    return flavor === "base" ? ["@base-ui/react"] : ["radix-ui"];
  }
  return NEUTRAL_SHADCN_DEPENDENCIES[name];
}

export async function resolveAllComponents(
  components: string[],
  flavor: RegistryFlavor = "base",
): Promise<ResolvedComponents> {
  const visited = new Set<string>();
  const mainNpmDeps = new Set<string>();
  const auiNpmDeps = new Set<string>();
  const shadcnNpmDeps = new Set<string>();

  const result: ResolvedComponents = {
    main: { files: [], dependencies: [] },
    auiDeps: { files: [], dependencies: [] },
    shadcn: { files: [], dependencies: [] },
  };

  async function resolveAssistantUI(
    name: string,
    isMain: boolean,
  ): Promise<void> {
    const key = `assistant-ui:${name}`;
    if (visited.has(key)) return;
    visited.add(key);

    const item = await readLocalRegistry(name, flavor);
    if (!item) return;

    if (item.dependencies) {
      for (const dep of item.dependencies) {
        if (isMain) {
          mainNpmDeps.add(dep);
        } else {
          auiNpmDeps.add(dep);
        }
      }
    }

    if (item.files) {
      for (const file of item.files) {
        const filePath = file.target ?? file.path;
        if (filePath === "lib/utils.ts") continue;

        const targetGroup = isMain ? result.main : result.auiDeps;
        targetGroup.files.push({
          name,
          path: filePath,
          content: file.content,
        });
      }
    }

    if (item.registryDependencies) {
      for (const dep of item.registryDependencies) {
        const parsed = parseRegistryDependency(dep);
        if (parsed.source === "assistant-ui") {
          await resolveAssistantUI(parsed.name, false);
        } else {
          await resolveShadcn(parsed.name);
        }
      }
    }
  }

  async function resolveShadcn(name: string): Promise<void> {
    const key = `shadcn:${name}`;
    if (visited.has(key)) return;
    visited.add(key);

    const content = await readLocalShadcnComponent(name, flavor);
    if (!content) return;

    const deps = shadcnDependencies(name, flavor);
    if (deps) {
      for (const dep of deps) {
        shadcnNpmDeps.add(dep);
      }
    }

    result.shadcn.files.push({
      name,
      path: `components/ui/${name}.tsx`,
      content,
    });
  }

  for (const component of components) {
    await resolveAssistantUI(component, true);
  }

  const ignoredDeps = new Set(["clsx", "tailwind-merge", "lucide-react"]);

  result.main.dependencies = Array.from(mainNpmDeps)
    .filter((dep) => !ignoredDeps.has(dep))
    .sort();
  result.auiDeps.dependencies = Array.from(auiNpmDeps)
    .filter((dep) => !ignoredDeps.has(dep))
    .sort();
  result.shadcn.dependencies = Array.from(shadcnNpmDeps)
    .filter((dep) => !ignoredDeps.has(dep))
    .sort();

  return result;
}

export async function ComponentSource({
  name,
  title,
  collapsible = true,
  flavor = "base",
}: {
  name: string;
  title?: string;
  collapsible?: boolean;
  flavor?: RegistryFlavor;
}) {
  const item = await readLocalRegistry(name, flavor);

  if (!item?.files?.[0]?.content) {
    return (
      <div className="border-destructive bg-destructive/10 text-destructive rounded-md border p-4 text-sm">
        Component &quot;{name}&quot; not found in registry
      </div>
    );
  }

  let code = item.files[0].content;
  const filePath = item.files[0].target ?? item.files[0].path;

  code = code.replaceAll("export default", "export");

  const lang = (filePath.split(".").pop() ?? "tsx") as "tsx" | "ts" | "js";
  const displayTitle = title ?? filePath;

  const content = (
    <DynamicCodeBlock
      lang={lang}
      code={code}
      codeblock={{
        title: displayTitle,
        className: "[&_pre]:max-h-[450px]",
      }}
    />
  );

  if (!collapsible) {
    return content;
  }

  return <CodeCollapsible code={code}>{content}</CodeCollapsible>;
}

export function ComponentSourceFromFile({
  file,
  collapsible = true,
}: {
  file: ResolvedFile;
  collapsible?: boolean;
}) {
  let code = file.content;

  code = code.replaceAll("export default", "export");

  const lang = (file.path.split(".").pop() ?? "tsx") as "tsx" | "ts" | "js";

  const content = (
    <DynamicCodeBlock
      lang={lang}
      code={code}
      codeblock={{
        title: file.path,
        className: "[&_pre]:max-h-[450px]",
      }}
    />
  );

  if (!collapsible) {
    return content;
  }

  return <CodeCollapsible code={code}>{content}</CodeCollapsible>;
}
