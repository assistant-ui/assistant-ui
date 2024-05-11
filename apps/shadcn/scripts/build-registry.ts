// @sts-nocheck
import { existsSync, promises as fs, readFileSync } from "node:fs";
import path, { basename } from "node:path";
import { rimraf } from "rimraf";
import type { Registry } from "../registry/schema";
import { styles } from "../registry/styles";
import { registry } from "../registry/registry";

const REGISTRY_PATH = path.join(process.cwd(), "public/registry");

async function buildRegistry(registry: Registry) {
  const names = registry.filter((item) => item.type === "components:ui");
  const registryJson = JSON.stringify(names, null, 2);
  rimraf.sync(path.join(REGISTRY_PATH, "index.json"));
  await fs.writeFile(
    path.join(REGISTRY_PATH, "index.json"),
    registryJson,
    "utf8",
  );
}

async function buildStyles(registry: Registry) {
  for (const style of styles) {
    const targetPath = path.join(REGISTRY_PATH, "styles", style.name);

    // Create directory if it doesn't exist.
    if (!existsSync(targetPath)) {
      await fs.mkdir(targetPath, { recursive: true });
    }

    for (const item of registry) {
      if (item.type !== "components:ui") {
        continue;
      }

      const files = item.files?.map((file) => {
        const content = readFileSync(
          path.join(process.cwd(), "registry", file),
          "utf8",
        );

        return {
          name: basename(file),
          content,
        };
      });

      const payload = {
        ...item,
        files,
      };

      await fs.writeFile(
        path.join(targetPath, `${item.name}.json`),
        JSON.stringify(payload, null, 2),
        "utf8",
      );
    }
  }

  // ----------------------------------------------------------------------------
  // Build registry/styles/index.json.
  // ----------------------------------------------------------------------------
  const stylesJson = JSON.stringify(styles, null, 2);
  await fs.writeFile(
    path.join(REGISTRY_PATH, "styles/index.json"),
    stylesJson,
    "utf8",
  );
}

try {
  await buildRegistry(registry);
  await buildStyles(registry);

  console.log("✅ Done!");
} catch (error) {
  console.error(error);
  process.exit(1);
}
