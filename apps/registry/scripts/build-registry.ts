import { existsSync, promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import * as ts from "typescript";
import { registry } from "../src/registry";
import { registrySchema, type RegistryItem } from "../src/schema";

const REGISTRY_PATH = path.join(process.cwd(), "dist");
const BASE_REGISTRY_PATH = path.join(REGISTRY_PATH, "base");
const REGISTRY_INDEX_PATH = path.join(REGISTRY_PATH, "registry.json");
const BASE_REGISTRY_INDEX_PATH = path.join(BASE_REGISTRY_PATH, "registry.json");
const REGISTRY_ITEM_SCHEMA_URL =
  "https://ui.shadcn.com/schema/registry-item.json";
const ASSISTANT_REGISTRY_DEPENDENCY_RE =
  /^https:\/\/r\.assistant-ui\.com\/(?:base\/)?(.+)\.json$/;
const BASE_VARIANT_FORBIDDEN_PATTERNS = [
  ["asChild", /\basChild\b/],
  ["delayDuration", /\bdelayDuration\b/],
  ['from "radix-ui"', /from\s+["']radix-ui["']/],
  ["data-[state=", /data-\[state=/],
] as const;
const PROJECT_PACKAGE_IMPORTS = new Set([
  "next",
  "next-themes",
  "react",
  "react-dom",
]);

type RegistryFile = NonNullable<RegistryItem["files"]>[number];
type RegistryBuildItem = Omit<RegistryItem, "baseRegistryDependencies">;
type RegistryOutputFile = Omit<RegistryFile, "sourcePath"> & {
  content: string;
};
type RegistryOutputItem = Omit<RegistryBuildItem, "files"> & {
  $schema: string;
  files?: RegistryOutputFile[];
};

/**
 * Transform @assistant-ui/react-ui/* imports to @/* imports for standalone projects
 * This is needed because the monorepo uses @assistant-ui/react-ui/* for internal imports
 * but the registry output should use @/* which works with standard shadcn setup
 */
function transformImports(content: string): string {
  return content
    .replace(/@assistant-ui\/react-ui\/lib\//g, "@/lib/")
    .replace(/@assistant-ui\/react-ui\/components\/ui\//g, "@/components/ui/")
    .replace(/@assistant-ui\/react-ui\/hooks\//g, "@/hooks/");
}

function validateRegistrySchema(registry: RegistryItem[]) {
  const result = registrySchema.safeParse(registry);

  if (!result.success) {
    const issues = result.error.issues
      .map((issue) => {
        const location = issue.path.length
          ? issue.path.map(String).join(".")
          : "registry";
        return `- ${location}: ${issue.message}`;
      })
      .join("\n");

    throw new Error(`Invalid registry metadata:\n${issues}`);
  }
}

function getBaseVariantSourcePath(sourcePath: string) {
  if (!sourcePath.endsWith(".tsx")) return null;

  return `${sourcePath.slice(0, -4)}.base.tsx`;
}

function validateBaseVariantContent(
  itemName: string,
  filePath: string,
  content: string,
) {
  for (const [label, pattern] of BASE_VARIANT_FORBIDDEN_PATTERNS) {
    if (pattern.test(content)) {
      throw new Error(
        `${itemName}: base variant for ${filePath} contains forbidden ${label}`,
      );
    }
  }
}

type BuiltRegistryPayload = {
  payload: RegistryOutputItem;
  readPaths: string[];
  baseVariantOutputPaths: string[];
};

function createRegistryPayload(
  item: RegistryBuildItem,
  useBaseVariants = false,
): BuiltRegistryPayload {
  const readPaths: string[] = [];
  const baseVariantOutputPaths: string[] = [];
  const files = item.files?.map((file) => {
    const sourcePath = file.sourcePath ?? file.path;
    const baseVariantPath = useBaseVariants
      ? getBaseVariantSourcePath(sourcePath)
      : null;
    const usesBaseVariant = Boolean(
      baseVariantPath && existsSync(path.join(process.cwd(), baseVariantPath)),
    );
    const readPath = usesBaseVariant ? baseVariantPath! : sourcePath;
    readPaths.push(readPath);
    if (usesBaseVariant) {
      baseVariantOutputPaths.push(file.path);
    }
    let content = readFileSync(path.join(process.cwd(), readPath), "utf8");

    if (usesBaseVariant) {
      content = content.replace(
        /@\/components\/ui-base\//g,
        "@/components/ui/",
      );
    }

    content = transformImports(content);

    if (usesBaseVariant) {
      validateBaseVariantContent(item.name, file.path, content);
    }

    const { sourcePath: _, ...fileOutput } = file;
    return {
      ...fileOutput,
      content,
    };
  });
  const { files: _, ...itemOutput } = item;

  const payload = {
    $schema: REGISTRY_ITEM_SCHEMA_URL,
    ...itemOutput,
  };

  return {
    payload: files ? { ...payload, files } : payload,
    readPaths,
    baseVariantOutputPaths,
  };
}

function assertRadixPassDidNotReadBaseSources(built: BuiltRegistryPayload[]) {
  for (const { payload, readPaths } of built) {
    for (const readPath of readPaths) {
      if (readPath.endsWith(".base.tsx")) {
        throw new Error(
          `${payload.name}: radix registry pass read base variant path ${readPath}`,
        );
      }
    }
  }
}

function assertVariantTreesDiffer(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const radixByName = new Map(
    radixBuilt.map((built) => [built.payload.name, built]),
  );

  for (const base of baseBuilt) {
    if (base.baseVariantOutputPaths.length === 0) continue;

    const radix = radixByName.get(base.payload.name);
    if (!radix) {
      throw new Error(
        `${base.payload.name}: base variant exists but radix payload is missing`,
      );
    }

    for (const filePath of base.baseVariantOutputPaths) {
      const radixContent = radix.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;
      const baseContent = base.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;

      if (radixContent === undefined || baseContent === undefined) {
        throw new Error(
          `${base.payload.name}: missing emitted content for ${filePath} while comparing radix and base trees`,
        );
      }

      if (radixContent === baseContent) {
        throw new Error(
          `${base.payload.name}: radix and base content for ${filePath} are identical despite a .base.tsx variant`,
        );
      }
    }
  }
}

function getAssistantRegistryDependencyName(dependency: string) {
  return ASSISTANT_REGISTRY_DEPENDENCY_RE.exec(dependency)?.[1] ?? null;
}

function createRadixRegistryItem(item: RegistryItem): RegistryBuildItem {
  const { baseRegistryDependencies: _, ...radixItem } = item;
  return radixItem;
}

function createBaseRegistryItem(item: RegistryItem): RegistryBuildItem {
  const { baseRegistryDependencies, ...baseItem } = item;
  const hasRegistryDependencies =
    baseItem.registryDependencies !== undefined ||
    baseRegistryDependencies !== undefined;

  if (!hasRegistryDependencies) return baseItem;

  const registryDependencies = [
    ...(baseItem.registryDependencies ?? []),
    ...(baseRegistryDependencies ?? []),
  ].map((dependency) => {
    const name = getAssistantRegistryDependencyName(dependency);
    return name ? `https://r.assistant-ui.com/base/${name}.json` : dependency;
  });

  return {
    ...baseItem,
    registryDependencies: [...new Set(registryDependencies)],
  };
}

function getPackageName(specifier: string) {
  if (specifier.startsWith("@")) {
    return specifier.split("/").slice(0, 2).join("/");
  }

  return specifier.split("/")[0]!;
}

function isStringLiteralLike(
  node: ts.Node,
): node is ts.StringLiteral | ts.NoSubstitutionTemplateLiteral {
  return ts.isStringLiteral(node) || ts.isNoSubstitutionTemplateLiteral(node);
}

function getScriptKind(filePath: string) {
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
}

function collectModuleSpecifiers(file: RegistryOutputFile) {
  const sourceFile = ts.createSourceFile(
    file.path,
    file.content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(file.path),
  );
  const specifiers = new Set<string>();

  const visit = (node: ts.Node) => {
    if (
      (ts.isImportDeclaration(node) || ts.isExportDeclaration(node)) &&
      node.moduleSpecifier &&
      isStringLiteralLike(node.moduleSpecifier)
    ) {
      specifiers.add(node.moduleSpecifier.text);
    }

    if (
      ts.isCallExpression(node) &&
      node.expression.kind === ts.SyntaxKind.ImportKeyword &&
      node.arguments.length === 1
    ) {
      const importArgument = node.arguments[0];
      if (importArgument && isStringLiteralLike(importArgument)) {
        specifiers.add(importArgument.text);
      }
    }

    if (
      ts.isImportTypeNode(node) &&
      ts.isLiteralTypeNode(node.argument) &&
      isStringLiteralLike(node.argument.literal)
    ) {
      specifiers.add(node.argument.literal.text);
    }

    ts.forEachChild(node, visit);
  };

  visit(sourceFile);
  return specifiers;
}

function getLocalComponentPath(specifier: string) {
  if (!specifier.startsWith("@/components/")) return null;

  const componentPath = specifier.slice(2);
  if (path.extname(componentPath)) return componentPath;

  return `${componentPath}.tsx`;
}

function collectCssPackageImports(value: unknown, imports = new Set<string>()) {
  if (typeof value === "string") {
    for (const match of value.matchAll(
      /@import\s+(?:url\()?["']([^"')]+)["']/g,
    )) {
      const specifier = match[1]!;
      if (!specifier.startsWith(".") && !specifier.startsWith("@/")) {
        imports.add(getPackageName(specifier));
      }
    }
  } else if (value && typeof value === "object") {
    for (const [key, childValue] of Object.entries(value)) {
      collectCssPackageImports(key, imports);
      collectCssPackageImports(childValue, imports);
    }
  }

  return imports;
}

function collectInstallContext(
  item: RegistryOutputItem,
  itemByName: Map<string, RegistryOutputItem>,
  seen = new Set<string>(),
) {
  if (seen.has(item.name)) {
    return { files: new Set<string>(), packages: new Set<string>() };
  }

  seen.add(item.name);

  const files = new Set(item.files?.map((file) => file.path) ?? []);
  const packages = new Set([
    ...(item.dependencies ?? []),
    ...(item.devDependencies ?? []),
  ]);

  for (const dependency of item.registryDependencies ?? []) {
    const assistantDependencyName =
      getAssistantRegistryDependencyName(dependency);

    if (assistantDependencyName) {
      const dependencyItem = itemByName.get(assistantDependencyName);
      if (!dependencyItem) continue;

      const dependencyContext = collectInstallContext(
        dependencyItem,
        itemByName,
        seen,
      );

      for (const file of dependencyContext.files) files.add(file);
      for (const pkg of dependencyContext.packages) packages.add(pkg);
    } else if (!dependency.startsWith("http")) {
      files.add(`components/ui/${dependency}.tsx`);
    }
  }

  return { files, packages };
}

function validateRegistryInstallMetadata(payloads: RegistryOutputItem[]) {
  const itemByName = new Map(payloads.map((item) => [item.name, item]));
  const findings = new Set<string>();

  for (const item of payloads) {
    for (const dependency of item.registryDependencies ?? []) {
      const assistantDependencyName =
        getAssistantRegistryDependencyName(dependency);

      if (assistantDependencyName && !itemByName.has(assistantDependencyName)) {
        findings.add(
          `${item.name}: registry dependency "${dependency}" does not match a local registry item`,
        );
      }
    }

    const installContext = collectInstallContext(item, itemByName);

    for (const file of item.files ?? []) {
      for (const specifier of collectModuleSpecifiers(file)) {
        const localComponentPath = getLocalComponentPath(specifier);

        if (localComponentPath) {
          if (!installContext.files.has(localComponentPath)) {
            findings.add(
              `${item.name}: ${file.path} imports "${specifier}", but no file or registryDependency provides ${localComponentPath}`,
            );
          }

          continue;
        }

        if (specifier.startsWith(".") || specifier.startsWith("@/")) {
          continue;
        }

        const packageName = getPackageName(specifier);
        if (
          !PROJECT_PACKAGE_IMPORTS.has(packageName) &&
          !installContext.packages.has(packageName)
        ) {
          findings.add(
            `${item.name}: ${file.path} imports package "${packageName}", but it is not declared in dependencies/devDependencies or a transitive assistant-ui registry dependency`,
          );
        }
      }
    }

    for (const packageName of collectCssPackageImports(item.css)) {
      if (!installContext.packages.has(packageName)) {
        findings.add(
          `${item.name}: registry css imports package "${packageName}", but it is not declared in dependencies/devDependencies or a transitive assistant-ui registry dependency`,
        );
      }
    }
  }

  if (findings.size > 0) {
    throw new Error(
      `Invalid registry install metadata:\n${[...findings]
        .map((finding) => `- ${finding}`)
        .join("\n")}`,
    );
  }
}

async function buildRegistry(registry: RegistryItem[]) {
  validateRegistrySchema(registry);

  const radixRegistry = registry.map(createRadixRegistryItem);
  const baseRegistry = registry.map(createBaseRegistryItem);
  validateRegistrySchema(radixRegistry);
  validateRegistrySchema(baseRegistry);

  const radixBuilt = radixRegistry.map((item) =>
    createRegistryPayload(item, false),
  );
  const baseBuilt = baseRegistry.map((item) =>
    createRegistryPayload(item, true),
  );
  assertRadixPassDidNotReadBaseSources(radixBuilt);
  assertVariantTreesDiffer(radixBuilt, baseBuilt);

  const payloads = radixBuilt.map((built) => built.payload);
  const basePayloads = baseBuilt.map((built) => built.payload);
  validateRegistryInstallMetadata(payloads);
  validateRegistryInstallMetadata(basePayloads);

  await fs.mkdir(REGISTRY_PATH, { recursive: true });
  await fs.mkdir(BASE_REGISTRY_PATH, { recursive: true });

  for (const payload of payloads) {
    const p = path.join(REGISTRY_PATH, `${payload.name}.json`);
    await fs.mkdir(path.dirname(p), { recursive: true });

    await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  }

  for (const payload of basePayloads) {
    const p = path.join(BASE_REGISTRY_PATH, `${payload.name}.json`);
    await fs.mkdir(path.dirname(p), { recursive: true });

    await fs.writeFile(p, JSON.stringify(payload, null, 2), "utf8");
  }

  const registryIndex = {
    $schema: "https://ui.shadcn.com/schema/registry.json",
    name: "assistant-ui",
    homepage: "https://assistant-ui.com",
    items: radixRegistry,
  };

  await fs.writeFile(
    REGISTRY_INDEX_PATH,
    JSON.stringify(registryIndex, null, 2),
    "utf8",
  );

  await fs.writeFile(
    BASE_REGISTRY_INDEX_PATH,
    JSON.stringify({ ...registryIndex, items: baseRegistry }, null, 2),
    "utf8",
  );
}

await buildRegistry(registry);
