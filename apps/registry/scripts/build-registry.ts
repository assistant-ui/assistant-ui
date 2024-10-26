import { promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { registry } from "../registry/registry";
import { RegistryItem } from "@/registry/schema";

const REGISTRY_PATH = path.join(process.cwd(), "dist");

async function buildRegistry(registry: RegistryItem[]) {
  await fs.mkdir(REGISTRY_PATH, { recursive: true });

  for (const item of registry) {
    const files = item.files?.map((file) => {
      const content = readFileSync(
        path.join(process.cwd(), "registry", file.path),
        "utf8",
      );

      return {
        content,
        ...file,
      };
    });

    const payload = {
      ...item,
      files,
    };

    const p = path.join(REGISTRY_PATH, `${item.name}.json`);
    await fs.mkdir(path.dirname(p), { recursive: true });

    await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  }
}

await buildRegistry(registry);
