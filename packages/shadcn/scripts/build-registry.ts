// @sts-nocheck
import { existsSync, promises as fs, readFileSync } from "node:fs";
import path, { basename } from "node:path";
import { rimraf } from "rimraf";
import type { Registry } from "../registry/schema";
import { registry } from "../registry/registry";

const getStyles = () => {
  return fetch("https://ui.shadcn.com/registry/styles/index.json").then((res) =>
    res.json(),
  ) as Promise<{ name: string }[]>;
};

const REGISTRY_PATH = path.join(
  process.cwd(),
  "../../apps/www/public/registry",
);

async function buildRegistry(registry: Registry) {
  if (!existsSync(REGISTRY_PATH)) {
    await fs.mkdir(REGISTRY_PATH, { recursive: true });
  }

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
  const styles = await getStyles();
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
          name: `assistant-ui/${basename(file)}`,
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
}

try {
  await buildRegistry(registry);
  await buildStyles(registry);

  console.log("✅ Done!");
} catch (error) {
  console.error(error);
  process.exit(1);
}
