import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { registry } from "../src/registry";
import { RegistryItem } from "@/src/schema";

const REGISTRY_PATH = path.join(process.cwd(), "dist");
const REGISTRY_INDEX_PATH = path.join(REGISTRY_PATH, "registry.json");

async function buildRegistry(registry: RegistryItem[]) {
  await fs.mkdir(REGISTRY_PATH, { recursive: true });

  for (const item of registry) {
    const files = item.files?.map((file) => {
      const content = readFileSync(path.join(process.cwd(), file.path), "utf8");

      // No transformation - just return content as-is
      return {
        content,
        ...file,
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
