import fs from "node:fs";
import path from "node:path";
import { ComponentSourceFromFile } from "@/components/docs/fumadocs/install/component-source";
import { PackageManagerTabs } from "@/components/docs/fumadocs/install/package-manager-tabs";

/**
 * Installation block for kit primitives that are not published as registry
 * items: optional npm dependencies plus the base-flavor source to copy.
 */
export function KitInstall({
  name,
  deps = [],
}: {
  name: string;
  deps?: string[];
}) {
  const filePath = path.join(
    process.cwd(),
    "../../packages/ui/src/components/ui/base",
    `${name}.tsx`,
  );

  let content: string;
  try {
    content = fs.readFileSync(filePath, "utf-8");
  } catch {
    return (
      <div className="border-destructive bg-destructive/10 text-destructive rounded-md border p-4 text-sm">
        Source for &quot;{name}&quot; not found
      </div>
    );
  }

  content = content.replaceAll("@/components/ui/radix/", "@/components/ui/");

  return (
    <div className="flex flex-col gap-4">
      {deps.length > 0 ? (
        <div>
          <p className="text-muted-foreground mb-3 text-sm">
            Install the dependencies:
          </p>
          <PackageManagerTabs packages={deps} />
        </div>
      ) : null}
      <div>
        <p className="text-muted-foreground mb-3 text-sm">
          Copy the source into <code>components/ui/{name}.tsx</code>. Registry
          items that depend on it install it automatically.
        </p>
        <ComponentSourceFromFile
          file={{ name, path: `components/ui/${name}.tsx`, content }}
        />
      </div>
    </div>
  );
}
