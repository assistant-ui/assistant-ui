import fs from "node:fs";
import path from "node:path";
import type { RegistryFlavor } from "@/components/pages/docs/fumadocs/install/component-source";

const UI_SRC = path.join(process.cwd(), "../../packages/ui/src");

function existsInUiSource(relativePath: string): boolean {
  return fs.existsSync(path.join(UI_SRC, relativePath));
}

const radixVariant = (relativePath: string): string =>
  relativePath.replace(/\.tsx$/, ".radix.tsx");

// Registry paths name the consumer's destination; the kit keeps the file under
// components/react, and the radix probes mirror the build's radix variant rule.
export function githubSourcePath(
  filePath: string,
  flavor: RegistryFlavor,
): string {
  const primitive = filePath.match(/^components\/ui\/(.+)$/)?.[1];
  if (primitive) {
    const flavored = `components/react/ui/${flavor}/${primitive}`;
    const twin = `components/react/ui/${flavor === "base" ? "radix" : "base"}/${primitive}`;
    const candidates =
      flavor === "radix"
        ? [radixVariant(flavored), flavored, radixVariant(twin), twin]
        : [flavored, twin];
    return candidates.find(existsInUiSource) ?? filePath;
  }

  const component = filePath.match(/^components\/(.+)$/)?.[1];
  if (component) {
    const source = `components/react/${component}`;
    const candidates =
      flavor === "radix" ? [radixVariant(source), source] : [source];
    return candidates.find(existsInUiSource) ?? filePath;
  }

  return filePath;
}
