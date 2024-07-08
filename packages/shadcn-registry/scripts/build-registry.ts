// @sts-nocheck
import { promises as fs, existsSync, readFileSync } from "node:fs";
import path, { basename } from "node:path";
import { rimraf } from "rimraf";
import { registry } from "../registry/registry";
import type { RegistryIndex } from "../registry/schema";

const getUpstreamStyles = () => {
  return fetch("https://ui.shadcn.com/registry/styles/index.json").then((res) =>
    res.json(),
  ) as Promise<{ name: string }[]>;
};

const getUpstreamRegistryIndex = () => {
  return fetch("https://ui.shadcn.com/registry/index.json").then((res) =>
    res.json(),
  ) as Promise<RegistryIndex>;
};

async function resolveTree(index: RegistryIndex, names: string[]) {
  const tree: RegistryIndex = [];

  for (const name of names) {
    const entry = index.find((entry) => entry.name === name);

    if (!entry) {
      continue;
    }

    tree.push(entry);

    if (entry.registryDependencies) {
      const dependencies = await resolveTree(index, entry.registryDependencies);
      tree.push(...dependencies);
    }
  }

  return tree.filter(
    (component, index, self) =>
      self.findIndex((c) => c.name === component.name) === index,
  );
}

const REGISTRY_PATH = path.join(
  process.cwd(),
  "../../apps/docs/public/registry",
);

async function buildRegistry(registry: RegistryIndex) {
  if (!existsSync(REGISTRY_PATH)) {
    await fs.mkdir(REGISTRY_PATH, { recursive: true });
  }

  // pull registryDependencies from upstream into the registry
  const upstreamRegistry = await getUpstreamRegistryIndex();
  const mergedRegistry = [...upstreamRegistry, ...registry];
  const registryAndUpstreamDeps = await resolveTree(
    mergedRegistry,
    registry.map((entry) => entry.name),
  );

  const registryJson = JSON.stringify(registryAndUpstreamDeps, null, 2);
  rimraf.sync(path.join(REGISTRY_PATH, "index.json"));
  await fs.writeFile(
    path.join(REGISTRY_PATH, "index.json"),
    registryJson,
    "utf8",
  );
}

async function buildStyles(registry: RegistryIndex) {
  const styles = await getUpstreamStyles();
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
