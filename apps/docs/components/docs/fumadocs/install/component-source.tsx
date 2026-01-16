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
  /** Main component files (the requested components) */
  main: ResolvedGroup;
  /** assistant-ui dependency files */
  auiDeps: ResolvedGroup;
  /** shadcn/ui dependency files */
  shadcn: ResolvedGroup;
};

async function readLocalRegistry(name: string): Promise<RegistryItem | null> {
  const localPath = path.join(
    process.cwd(),
    "../registry/dist",
    `${name}.json`,
  );

  try {
    const content = await fs.readFile(localPath, "utf-8");
    return JSON.parse(content) as RegistryItem;
  } catch {
    return null;
  }
}

async function readLocalShadcnComponent(name: string): Promise<string | null> {
  const localPath = path.join(process.cwd(), "components/ui", `${name}.tsx`);

  try {
    return await fs.readFile(localPath, "utf-8");
  } catch {
    return null;
  }
}

function parseRegistryDependency(dep: string): {
  source: "assistant-ui" | "shadcn";
  name: string;
} {
  if (dep.startsWith("https://r.assistant-ui.com/")) {
    return {
      source: "assistant-ui",
      name: dep.replace("https://r.assistant-ui.com/", "").replace(".json", ""),
    };
  }
  // Plain name = shadcn component
  return { source: "shadcn", name: dep };
}

// Known shadcn component dependencies (npm packages)
const SHADCN_DEPENDENCIES: Record<string, string[]> = {
  button: ["@radix-ui/react-slot"],
  tooltip: ["@radix-ui/react-tooltip"],
  collapsible: ["@radix-ui/react-collapsible"],
  dialog: ["@radix-ui/react-dialog"],
  popover: ["@radix-ui/react-popover"],
  "dropdown-menu": ["@radix-ui/react-dropdown-menu"],
  avatar: ["@radix-ui/react-avatar"],
  select: ["@radix-ui/react-select"],
  separator: ["@radix-ui/react-separator"],
  tabs: ["@radix-ui/react-tabs"],
  toggle: ["@radix-ui/react-toggle"],
  "toggle-group": ["@radix-ui/react-toggle-group"],
  checkbox: ["@radix-ui/react-checkbox"],
  label: ["@radix-ui/react-label"],
  progress: ["@radix-ui/react-progress"],
  slider: ["@radix-ui/react-slider"],
  switch: ["@radix-ui/react-switch"],
  "scroll-area": ["@radix-ui/react-scroll-area"],
  "context-menu": ["@radix-ui/react-context-menu"],
  "alert-dialog": ["@radix-ui/react-alert-dialog"],
  "hover-card": ["@radix-ui/react-hover-card"],
  menubar: ["@radix-ui/react-menubar"],
  "navigation-menu": ["@radix-ui/react-navigation-menu"],
  "radio-group": ["@radix-ui/react-radio-group"],
  accordion: ["@radix-ui/react-accordion"],
  "aspect-ratio": ["@radix-ui/react-aspect-ratio"],
  form: ["react-hook-form", "@hookform/resolvers", "zod"],
  resizable: ["react-resizable-panels"],
  sonner: ["sonner"],
  drawer: ["vaul"],
  carousel: ["embla-carousel-react"],
  "input-otp": ["input-otp"],
  sidebar: ["@radix-ui/react-slot", "@radix-ui/react-tooltip"],
};

export async function resolveAllComponents(
  components: string[],
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

  // Collect dependencies for a component (returns them in order: component first, then its deps)
  async function resolveAssistantUI(
    name: string,
    isMain: boolean,
  ): Promise<void> {
    const key = `assistant-ui:${name}`;
    if (visited.has(key)) return;
    visited.add(key);

    const item = await readLocalRegistry(name);
    if (!item) return;

    // Collect npm dependencies
    if (item.dependencies) {
      for (const dep of item.dependencies) {
        if (isMain) {
          mainNpmDeps.add(dep);
        } else {
          auiNpmDeps.add(dep);
        }
      }
    }

    // First add all files from this component (skip if no files - e.g. style items)
    if (item.files) {
      for (const file of item.files) {
        const filePath = file.target ?? file.path;
        // Skip lib/utils.ts
        if (filePath === "lib/utils.ts") continue;

        const targetGroup = isMain ? result.main : result.auiDeps;
        targetGroup.files.push({
          name,
          path: filePath,
          content: file.content,
        });
      }
    }

    // Then resolve dependencies (component first, then its deps)
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

    const content = await readLocalShadcnComponent(name);
    if (!content) return;

    // Collect npm dependencies for shadcn components
    const deps = SHADCN_DEPENDENCIES[name];
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

  // Resolve all requested components (mark them as main)
  for (const component of components) {
    await resolveAssistantUI(component, true);
  }

  // Dependencies to ignore (assume user already has them)
  const ignoredDeps = new Set(["clsx", "tailwind-merge", "lucide-react"]);

  // Convert sets to sorted arrays, filtering out ignored deps
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
}: {
  name: string;
  title?: string;
  collapsible?: boolean;
}) {
  const item = await readLocalRegistry(name);

  if (!item?.files?.[0]?.content) {
    return (
      <div className="rounded-md border border-destructive bg-destructive/10 p-4 text-destructive text-sm">
        Component &quot;{name}&quot; not found in registry
      </div>
    );
  }

  let code = item.files[0].content;
  const filePath = item.files[0].target ?? item.files[0].path;

  // Clean up the code - similar to shadcn's transforms
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

  // Clean up the code
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
