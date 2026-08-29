import fs from "node:fs";
import path from "node:path";
import type { RegistryFlavor } from "@/components/pages/docs/fumadocs/install/component-source";

const UI_SRC = path.join(process.cwd(), "../../packages/ui/src");

function existsInUiSource(relativePath: string): boolean {
  return fs.existsSync(path.join(UI_SRC, relativePath));
}

const radixVariant = (relativePath: string): string =>
  relativePath.replace(/\.tsx$/, ".radix.tsx");

// Registry paths name where a file lands in the consumer's project; the kit
// stores it under components/react, with a flavor directory for the primitives.
// The radix probes mirror getRadixVariantSourcePath in the registry build, which
// prefers a .radix.tsx sibling over the file it sits next to.
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
