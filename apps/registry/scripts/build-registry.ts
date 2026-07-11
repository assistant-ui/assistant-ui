import { existsSync, promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
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
const RADIX_IMPORT_RE =
  /(?:from|import)\s*\(?\s*["'](?:radix-ui["']|@radix-ui\/)/;
const BASE_VARIANT_FORBIDDEN_PATTERNS = [
  ["asChild", /\basChild\b/],
  ["delayDuration", /\bdelayDuration\b/],
  ["radix import", RADIX_IMPORT_RE],
  ["data-[state=", /data-\[state=/],
] as const;
const MARKED_UI_SPECIFIERS = ["radix", "base"].map(
  (flavor) => `@/components/ui/${flavor}/`,
);
const PROJECT_PACKAGE_IMPORTS = new Set([
  "next",
  "next-themes",
  "react",
  "react-dom",
]);

type RegistryFile = NonNullable<RegistryItem["files"]>[number];
type RegistryBuildItem = Omit<
  RegistryItem,
  "baseRegistryDependencies" | "radixDependencies" | "baseDependencies"
>;
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

function throwIfFindings(header: string, findings: Set<string>): void {
  if (findings.size > 0) {
    throw new Error(
      `${header}\n${[...findings].map((finding) => `- ${finding}`).join("\n")}`,
    );
  }
}

export function getBaseVariantSourcePath(sourcePath: string) {
  if (!sourcePath.endsWith(".tsx")) return null;

  return `${sourcePath.slice(0, -4)}.base.tsx`;
}

type BuiltRegistryPayload = {
  payload: RegistryOutputItem;
  readPaths: string[];
  baseVariantOutputPaths: string[];
  sourceContentsByOutputPath: Map<string, string>;
};

export function validateBaseVariantContent(built: BuiltRegistryPayload[]) {
  const findings = new Set<string>();

  for (const { payload, baseVariantOutputPaths } of built) {
    const outputPaths = new Set(baseVariantOutputPaths);

    for (const file of payload.files ?? []) {
      if (!outputPaths.has(file.path)) continue;

      for (const [label, pattern] of BASE_VARIANT_FORBIDDEN_PATTERNS) {
        if (pattern.test(file.content)) {
          findings.add(
            `${payload.name}: base variant for ${file.path} contains forbidden ${label}`,
          );
        }
      }
    }
  }

  throwIfFindings("Invalid base variant content:", findings);
}

export function validateBaseTreeRadixImports(
  baseBuilt: BuiltRegistryPayload[],
) {
  const findings = new Set<string>();

  for (const { payload } of baseBuilt) {
    for (const file of payload.files ?? []) {
      if (RADIX_IMPORT_RE.test(file.content)) {
        findings.add(
          `${payload.name}: base tree file ${file.path} imports radix`,
        );
      }
    }
  }

  throwIfFindings("Invalid base tree imports:", findings);
}

export function validateEmittedSpecifierHygiene(built: BuiltRegistryPayload[]) {
  const findings = new Set<string>();

  for (const { payload } of built) {
    for (const file of payload.files ?? []) {
      for (const token of MARKED_UI_SPECIFIERS) {
        if (file.content.includes(token)) {
          findings.add(`${payload.name}: ${file.path} contains ${token}`);
        }
      }
    }
  }

  throwIfFindings("Invalid emitted UI specifiers:", findings);
}

function createRegistryPayload(
  item: RegistryBuildItem,
  useBaseVariants = false,
): BuiltRegistryPayload {
  const readPaths: string[] = [];
  const baseVariantOutputPaths: string[] = [];
  const sourceContentsByOutputPath = new Map<string, string>();
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
    sourceContentsByOutputPath.set(file.path, content);

    if (!useBaseVariants) {
      content = content.replace(
        /@\/components\/ui\/radix\//g,
        "@/components/ui/",
      );
    }

    content = transformImports(content);

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
    sourceContentsByOutputPath,
  };
}

export function validateRadixPassDidNotReadBaseSources(
  built: BuiltRegistryPayload[],
) {
  const findings = new Set<string>();

  for (const { payload, readPaths } of built) {
    for (const readPath of readPaths) {
      if (readPath.endsWith(".base.tsx")) {
        findings.add(
          `${payload.name}: radix registry pass read base variant path ${readPath}`,
        );
      }
    }
  }

  throwIfFindings("Invalid radix registry source reads:", findings);
}

export function validateVariantTreesDiffer(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const radixByName = new Map(
    radixBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const base of baseBuilt) {
    if (base.baseVariantOutputPaths.length === 0) continue;

    const radix = radixByName.get(base.payload.name);
    if (!radix) {
      findings.add(
        `${base.payload.name}: base variant exists but radix payload is missing`,
      );
      continue;
    }

    for (const filePath of base.baseVariantOutputPaths) {
      const radixContent = radix.sourceContentsByOutputPath.get(filePath);
      const baseContent = base.sourceContentsByOutputPath.get(filePath);

      if (radixContent === undefined || baseContent === undefined) {
        findings.add(
          `${base.payload.name}: missing source content for ${filePath} while comparing radix and base trees`,
        );
        continue;
      }

      if (radixContent === baseContent) {
        findings.add(
          `${base.payload.name}: radix and base sources for ${filePath} are identical despite a .base.tsx variant`,
        );
      }
    }
  }

  throwIfFindings("Invalid registry variant trees:", findings);
}

function collectDataSlots(content: string) {
  const slots = new Set<string>();
  for (const match of content.matchAll(/"?data-slot"?\s*[:=]\s*"([^"]+)"/g)) {
    slots.add(match[1]!);
  }
  return slots;
}

function formatSetDifference(onlyInRadix: string[], onlyInBase: string[]) {
  const parts: string[] = [];
  if (onlyInRadix.length > 0) {
    parts.push(`radix-only: ${onlyInRadix.join(", ")}`);
  }
  if (onlyInBase.length > 0) {
    parts.push(`base-only: ${onlyInBase.join(", ")}`);
  }
  return parts.join("; ");
}

export function validateVariantSlotParity(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const radixByName = new Map(
    radixBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const base of baseBuilt) {
    if (base.baseVariantOutputPaths.length === 0) continue;

    const radix = radixByName.get(base.payload.name);
    if (!radix) {
      findings.add(
        `${base.payload.name}: base variant exists but radix payload is missing`,
      );
      continue;
    }

    for (const filePath of base.baseVariantOutputPaths) {
      const radixContent = radix.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;
      const baseContent = base.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;

      if (radixContent === undefined || baseContent === undefined) {
        findings.add(
          `${base.payload.name}: missing emitted content for ${filePath} while comparing radix and base slots`,
        );
        continue;
      }

      const radixSlots = collectDataSlots(radixContent);
      const baseSlots = collectDataSlots(baseContent);
      const onlyInRadix = [...radixSlots]
        .filter((slot) => !baseSlots.has(slot))
        .sort();
      const onlyInBase = [...baseSlots]
        .filter((slot) => !radixSlots.has(slot))
        .sort();

      if (onlyInRadix.length > 0 || onlyInBase.length > 0) {
        findings.add(
          `${base.payload.name}: data-slot attributes differ for ${filePath} (${formatSetDifference(onlyInRadix, onlyInBase)})`,
        );
      }
    }
  }

  throwIfFindings("Invalid variant slot parity:", findings);
}

function collectExportedNames(content: string, filePath: string) {
  const sourceFile = ts.createSourceFile(
    filePath,
    content,
    ts.ScriptTarget.Latest,
    true,
    getScriptKind(filePath),
  );
  const names = new Set<string>();

  for (const stmt of sourceFile.statements) {
    if (ts.isExportDeclaration(stmt) && stmt.exportClause) {
      if (ts.isNamedExports(stmt.exportClause)) {
        for (const element of stmt.exportClause.elements) {
          names.add(element.name.text);
        }
      } else if (ts.isNamespaceExport(stmt.exportClause)) {
        names.add(stmt.exportClause.name.text);
      }
    }

    if (
      ts.isExportDeclaration(stmt) &&
      !stmt.exportClause &&
      stmt.moduleSpecifier &&
      isStringLiteralLike(stmt.moduleSpecifier)
    ) {
      names.add(`*:${stmt.moduleSpecifier.text}`);
    }

    if (
      ts.canHaveModifiers(stmt) &&
      ts.getModifiers(stmt)?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      if (
        (ts.isFunctionDeclaration(stmt) ||
          ts.isClassDeclaration(stmt) ||
          ts.isTypeAliasDeclaration(stmt) ||
          ts.isInterfaceDeclaration(stmt) ||
          ts.isEnumDeclaration(stmt)) &&
        stmt.name
      ) {
        names.add(
          ts
            .getModifiers(stmt)
            ?.some((m) => m.kind === ts.SyntaxKind.DefaultKeyword)
            ? "default"
            : stmt.name.text,
        );
      } else if (ts.isVariableStatement(stmt)) {
        for (const declaration of stmt.declarationList.declarations) {
          if (ts.isIdentifier(declaration.name)) {
            names.add(declaration.name.getText(sourceFile));
          }
        }
      }
    }

    if (ts.isExportAssignment(stmt)) {
      names.add("default");
    }
  }

  return names;
}

export function validateVariantExportParity(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const radixByName = new Map(
    radixBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const base of baseBuilt) {
    if (base.baseVariantOutputPaths.length === 0) continue;

    const radix = radixByName.get(base.payload.name);
    if (!radix) {
      findings.add(
        `${base.payload.name}: base variant exists but radix payload is missing`,
      );
      continue;
    }

    for (const filePath of base.baseVariantOutputPaths) {
      const radixContent = radix.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;
      const baseContent = base.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;

      if (radixContent === undefined || baseContent === undefined) {
        findings.add(
          `${base.payload.name}: missing emitted content for ${filePath} while comparing radix and base exports`,
        );
        continue;
      }

      const radixExports = collectExportedNames(radixContent, filePath);
      const baseExports = collectExportedNames(baseContent, filePath);
      const onlyInRadix = [...radixExports]
        .filter((name) => !baseExports.has(name))
        .sort();
      const onlyInBase = [...baseExports]
        .filter((name) => !radixExports.has(name))
        .sort();

      if (onlyInRadix.length > 0 || onlyInBase.length > 0) {
        findings.add(
          `${base.payload.name}: exported symbols differ for ${filePath} (${formatSetDifference(onlyInRadix, onlyInBase)})`,
        );
      }
    }
  }

  throwIfFindings("Invalid variant export parity:", findings);
}

function collectUsedPackages(payload: RegistryOutputItem) {
  const packages = new Set<string>();

  for (const file of payload.files ?? []) {
    for (const specifier of collectModuleSpecifiers(file)) {
      if (specifier.startsWith(".") || specifier.startsWith("@/")) continue;
      packages.add(getPackageName(specifier));
    }
  }

  for (const packageName of collectCssPackageImports(payload.css)) {
    packages.add(packageName);
  }

  return packages;
}

export function validateStyleScopedDependencies(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const radixByName = new Map(
    radixBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const base of baseBuilt) {
    const radix = radixByName.get(base.payload.name);
    if (!radix) continue;

    const radixUsed = collectUsedPackages(radix.payload);
    const baseUsed = collectUsedPackages(base.payload);

    for (const dependency of radix.payload.dependencies ?? []) {
      if (!radixUsed.has(dependency) && baseUsed.has(dependency)) {
        findings.add(
          `${base.payload.name}: dependency "${dependency}" is declared for the radix tree but only used by the base tree; move it to baseDependencies`,
        );
      }
    }

    for (const dependency of base.payload.dependencies ?? []) {
      if (!baseUsed.has(dependency) && radixUsed.has(dependency)) {
        findings.add(
          `${base.payload.name}: dependency "${dependency}" is declared for the base tree but only used by the radix tree; move it to radixDependencies`,
        );
      }
    }
  }

  throwIfFindings("Invalid style-scoped dependencies:", findings);
}

function getAssistantRegistryDependencyName(dependency: string) {
  return ASSISTANT_REGISTRY_DEPENDENCY_RE.exec(dependency)?.[1] ?? null;
}

export function createRadixRegistryItem(item: RegistryItem): RegistryBuildItem {
  const {
    baseRegistryDependencies: _,
    radixDependencies,
    baseDependencies: __,
    ...radixItem
  } = item;

  const hasDependencies =
    radixItem.dependencies !== undefined || radixDependencies !== undefined;

  if (!hasDependencies) return radixItem;

  return {
    ...radixItem,
    dependencies: [
      ...new Set([
        ...(radixItem.dependencies ?? []),
        ...(radixDependencies ?? []),
      ]),
    ],
  };
}

export function createBaseRegistryItem(item: RegistryItem): RegistryBuildItem {
  const {
    baseRegistryDependencies,
    radixDependencies: _,
    baseDependencies,
    ...baseItem
  } = item;

  const hasRegistryDependencies =
    baseItem.registryDependencies !== undefined ||
    baseRegistryDependencies !== undefined;

  const hasDependencies =
    baseItem.dependencies !== undefined || baseDependencies !== undefined;

  let result = baseItem;

  if (hasRegistryDependencies) {
    const registryDependencies = [
      ...(baseItem.registryDependencies ?? []),
      ...(baseRegistryDependencies ?? []),
    ].map((dependency) => {
      const name = getAssistantRegistryDependencyName(dependency);
      return name ? `https://r.assistant-ui.com/base/${name}.json` : dependency;
    });

    result = {
      ...result,
      registryDependencies: [...new Set(registryDependencies)],
    };
  }

  if (!hasDependencies) return result;

  return {
    ...result,
    dependencies: [
      ...new Set([...(result.dependencies ?? []), ...(baseDependencies ?? [])]),
    ],
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

  throwIfFindings("Invalid registry install metadata:", findings);
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
  validateBaseVariantContent(baseBuilt);
  validateBaseTreeRadixImports(baseBuilt);
  validateEmittedSpecifierHygiene([...radixBuilt, ...baseBuilt]);
  validateRadixPassDidNotReadBaseSources(radixBuilt);
  validateVariantTreesDiffer(radixBuilt, baseBuilt);
  validateVariantSlotParity(radixBuilt, baseBuilt);
  validateVariantExportParity(radixBuilt, baseBuilt);
  validateStyleScopedDependencies(radixBuilt, baseBuilt);

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

const entrypoint = process.argv[1];
if (
  entrypoint &&
  import.meta.url === pathToFileURL(path.resolve(entrypoint)).href
) {
  await buildRegistry(registry);
}
