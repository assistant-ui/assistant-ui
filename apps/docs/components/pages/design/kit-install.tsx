import fs from "node:fs";
import path from "node:path";
import { Flavored } from "@/components/pages/docs/contexts/flavor.server";
import { ComponentSourceFromFile } from "@/components/pages/docs/fumadocs/install/component-source";
import { PackageManagerTabs } from "@/components/pages/docs/fumadocs/install/package-manager-tabs";

const IGNORED_DEPS = new Set([
  "react",
  "lucide-react",
  "clsx",
  "tailwind-merge",
]);

function readFlavor(name: string, flavor: "base" | "radix") {
  const filePath = path.join(
    process.cwd(),
    "../../packages/ui/src/components/react/ui",
    flavor,
    `${name}.tsx`,
  );

  let content = fs.readFileSync(filePath, "utf-8");
  content = content.replaceAll("@/components/ui/radix/", "@/components/ui/");

  const deps = new Set<string>();
  for (const match of content.matchAll(/from "([^"]+)"/g)) {
    const specifier = match[1]!;
    if (specifier.startsWith("@/") || specifier.startsWith(".")) continue;
    const pkg = specifier.startsWith("@")
      ? specifier.split("/").slice(0, 2).join("/")
      : specifier.split("/")[0]!;
    if (!IGNORED_DEPS.has(pkg)) deps.add(pkg);
  }

  return { content, deps: Array.from(deps).sort() };
}

function KitInstallFlavor({
  name,
  flavor,
}: {
  name: string;
  flavor: "base" | "radix";
}) {
  let file: { content: string; deps: string[] };
  try {
    file = readFlavor(name, flavor);
  } catch {
    return (
      <div className="border-destructive bg-destructive/10 text-destructive rounded-md border p-4 text-sm">
        Source for &quot;{name}&quot; not found
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {file.deps.length > 0 ? (
        <div>
          <p className="text-muted-foreground mb-3 text-sm">
            Install the dependencies:
          </p>
          <PackageManagerTabs packages={file.deps} />
        </div>
      ) : null}
      <div>
        <p className="text-muted-foreground mb-3 text-sm">
          Copy the source into <code>components/ui/{name}.tsx</code>. Registry
          items that depend on it install it automatically.
        </p>
        <ComponentSourceFromFile
          file={{
            name,
            path: `components/ui/${name}.tsx`,
            content: file.content,
          }}
        />
      </div>
    </div>
  );
}

/**
 * Installation block for kit primitives that are not published as registry
 * items: the dependencies each flavor's source actually imports, plus that
 * source to copy.
 */
export function KitInstall({ name }: { name: string }) {
  return (
    <Flavored
      radix={<KitInstallFlavor name={name} flavor="radix" />}
      base={<KitInstallFlavor name={name} flavor="base" />}
    />
  );
}
