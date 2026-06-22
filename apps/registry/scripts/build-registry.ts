import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { registry } from "../src/registry";
import type { RegistryItem } from "@/src/schema";

const REGISTRY_PATH = path.join(process.cwd(), "dist");
const REGISTRY_INDEX_PATH = path.join(REGISTRY_PATH, "registry.json");

/**
 * Transform @assistant-ui/react-ui/* imports to @/* imports for standalone projects
 * This is needed because the monorepo uses @assistant-ui/react-ui/* for internal imports
 * but the registry output should use @/* which works with standard shadcn setup
 */
function transformImports(content: string): string {
  return content
    .replace(/@assistant-ui\/react-ui\/lib\//g, "@/lib/")
    .replace(/@assistant-ui\/react-ui\/components\/ui\//g, "@/components/ui/")
    .replace(/@assistant-ui\/react-ui\/hooks\//g, "@/hooks/");
}

const getShadcnUiImports = (content: string) => {
  return [
    ...content.matchAll(/from\s+["']@\/components\/ui\/([^"']+)["']/g),
  ].map((match) => match[1]!.replace(/\.(?:tsx?|jsx?)$/, "").split("/")[0]!);
};

function validateRegistryDependencies(
  item: RegistryItem,
  files: NonNullable<RegistryItem["files"]>,
) {
  const registryDependencies = new Set(item.registryDependencies ?? []);
  const missing = new Set<string>();

  for (const file of files) {
    const content = "content" in file ? file.content : undefined;
    if (!content) continue;

    for (const dependency of getShadcnUiImports(content)) {
      if (!registryDependencies.has(dependency)) missing.add(dependency);
    }
  }

  if (missing.size > 0) {
    throw new Error(
      `Registry item "${item.name}" imports shadcn UI component(s) without registryDependencies: ${[
        ...missing,
      ].join(", ")}`,
    );
  }
}

async function buildRegistry(registry: RegistryItem[]) {
  await fs.mkdir(REGISTRY_PATH, { recursive: true });

  for (const item of registry) {
    const files = item.files?.map((file) => {
      // Read from sourcePath if provided, otherwise use path
      const readPath = file.sourcePath ?? file.path;
      let content = readFileSync(path.join(process.cwd(), readPath), "utf8");

      // Transform @assistant-ui/react-ui/* imports to @/* imports
      content = transformImports(content);

      // Exclude sourcePath from output (it's only for build)
      const { sourcePath: _, ...fileOutput } = file;
      return {
        content,
        ...fileOutput,
      };
    });

    if (files) {
      validateRegistryDependencies(item, files);
    }

    const payload = {
      $schema: "https://ui.shadcn.com/schema/registry-item.json",
      ...item,
      files,
    };

    const p = path.join(REGISTRY_PATH, `${item.name}.json`);
    await fs.mkdir(path.dirname(p), { recursive: true });

    await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  }

  const registryIndex = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "assistant-ui",
    homepage: "https://assistant-ui.com",
    items: registry,
  };

  await fs.writeFile(
    REGISTRY_INDEX_PATH,
    JSON.stringify(registryIndex, null, 2),
    "utf8",
  );
}

await buildRegistry(registry);
