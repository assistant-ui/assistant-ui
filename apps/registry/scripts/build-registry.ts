import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { registry } from "../src/registry";
import { RegistryItem } from "@/src/schema";

const REGISTRY_PATH = path.join(process.cwd(), "dist");
const REGISTRY_INDEX_PATH = path.join(REGISTRY_PATH, "registry.json");

/**
 * Transform @assistant-ui/ui/* imports to @/* imports for standalone projects
 * This is needed because the monorepo uses @assistant-ui/ui/* for internal imports
 * but the registry output should use @/* which works with standard shadcn setup
 */
function transformImports(content: string): string {
  return content
    .replace(/@assistant-ui\/ui\/lib\//g, "@/lib/")
    .replace(/@assistant-ui\/ui\/components\/ui\//g, "@/components/ui/")
    .replace(/@assistant-ui\/ui\/hooks\//g, "@/hooks/");
}

async function buildRegistry(registry: RegistryItem[]) {
  await fs.mkdir(REGISTRY_PATH, { recursive: true });

  for (const item of registry) {
    const files = item.files?.map((file) => {
      // Read from sourcePath if provided, otherwise use path
      const readPath = file.sourcePath ?? file.path;
      let content = readFileSync(path.join(process.cwd(), readPath), "utf8");

      // Transform @assistant-ui/ui/* imports to @/* imports
      content = transformImports(content);

      // Exclude sourcePath from output (it's only for build)
      const { sourcePath: _, ...fileOutput } = file;
      return {
        content,
        ...fileOutput,
      };
    });

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
