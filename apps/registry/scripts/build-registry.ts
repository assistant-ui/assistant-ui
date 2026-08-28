import { existsSync, promises as fs, readFileSync } from "node:fs";
import * as path from "node:path";
import { pathToFileURL } from "node:url";
import * as ts from "typescript";
import {
  isDeclarationBlock,
  type CssDeclarationBlock,
  type CssMediaBlock,
} from "@assistant-ui/ui/lib/generative-ui-vocabulary-css.ts";
import { registry, vueRegistry } from "../src/registry";
import { registrySchema, type RegistryItem } from "../src/schema";

const REGISTRY_PATH = path.join(process.cwd(), "dist");
const BASE_REGISTRY_PATH = path.join(REGISTRY_PATH, "base");
const VUE_REGISTRY_PATH = path.join(REGISTRY_PATH, "vue");
const REGISTRY_INDEX_PATH = path.join(REGISTRY_PATH, "registry.json");
const BASE_REGISTRY_INDEX_PATH = path.join(BASE_REGISTRY_PATH, "registry.json");
const VUE_REGISTRY_INDEX_PATH = path.join(VUE_REGISTRY_PATH, "registry.json");
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
const UI_PRIMITIVE_SOURCE_ROOT = "../../packages/ui/src/components/ui";
const UI_PRIMITIVE_PACKAGE = {
  radix: "radix-ui",
  base: "@base-ui/react",
} as const;
const PROJECT_PACKAGE_IMPORTS = new Set([
  "next",
  "next-themes",
  "react",
  "react-dom",
  "vue",
]);

type RegistryFile = NonNullable<RegistryItem["files"]>[number];
type RegistryBuildItem = Omit<
  RegistryItem,
  | "bundledRegistryDependencies"
  | "baseRegistryDependencies"
  | "radixDependencies"
  | "baseDependencies"
>;
type UiFlavor = "radix" | "base";
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

export function getRadixVariantSourcePath(sourcePath: string) {
  if (!sourcePath.endsWith(".tsx")) return null;

  return `${sourcePath.slice(0, -4)}.radix.tsx`;
}

type BuiltRegistryPayload = {
  payload: RegistryOutputItem;
  readPaths: string[];
  radixVariantOutputPaths: string[];
  sourceContentsByOutputPath: Map<string, string>;
};

export function validateBaseVariantContent(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const baseByName = new Map(
    baseBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const { payload, radixVariantOutputPaths } of radixBuilt) {
    const outputPaths = new Set(radixVariantOutputPaths);
    if (outputPaths.size === 0) continue;

    const base = baseByName.get(payload.name);
    if (!base) continue;

    for (const file of base.payload.files ?? []) {
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

const VUE_FORBIDDEN_PACKAGES = [
  "react",
  "react-dom",
  "lucide-react",
  "radix-ui",
  "@radix-ui",
  "@base-ui",
  "@assistant-ui/react",
];
const VUE_FORBIDDEN_PREFIXES = ["@assistant-ui/react-"];

function isVueForbiddenPackage(specifier: string) {
  return (
    VUE_FORBIDDEN_PACKAGES.some(
      (packageName) =>
        specifier === packageName || specifier.startsWith(`${packageName}/`),
    ) || VUE_FORBIDDEN_PREFIXES.some((prefix) => specifier.startsWith(prefix))
  );
}

export function validateVueFlavorContent(vueBuilt: BuiltRegistryPayload[]) {
  const findings = new Set<string>();

  for (const { payload } of vueBuilt) {
    for (const file of payload.files ?? []) {
      for (const script of getScriptContents(file)) {
        if (
          script.lang !== undefined &&
          script.lang !== "ts" &&
          script.lang !== "js"
        ) {
          findings.add(
            `${payload.name}: vue tree file ${file.path} has unsupported script lang "${script.lang}"`,
          );
        }
      }

      for (const specifier of collectModuleSpecifiers(file)) {
        if (isVueForbiddenPackage(specifier)) {
          findings.add(
            `${payload.name}: vue tree file ${file.path} imports forbidden "${specifier}"`,
          );
        }
      }
    }
  }

  throwIfFindings("Invalid vue flavor content:", findings);
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
  useRadixVariants = false,
): BuiltRegistryPayload {
  const readPaths: string[] = [];
  const radixVariantOutputPaths: string[] = [];
  const sourceContentsByOutputPath = new Map<string, string>();
  const files = item.files?.map((file) => {
    const sourcePath = file.sourcePath ?? file.path;
    const radixVariantPath = useRadixVariants
      ? getRadixVariantSourcePath(sourcePath)
      : null;
    const usesRadixVariant = Boolean(
      radixVariantPath &&
      existsSync(path.join(process.cwd(), radixVariantPath)),
    );
    const readPath = usesRadixVariant ? radixVariantPath! : sourcePath;
    readPaths.push(readPath);
    if (usesRadixVariant) {
      radixVariantOutputPaths.push(file.path);
    }
    let content = readFileSync(path.join(process.cwd(), readPath), "utf8");
    sourceContentsByOutputPath.set(file.path, content);

    if (useRadixVariants) {
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
    radixVariantOutputPaths,
    sourceContentsByOutputPath,
  };
}

export function validateBasePassDidNotReadRadixSources(
  built: BuiltRegistryPayload[],
) {
  const findings = new Set<string>();

  for (const { payload, readPaths } of built) {
    for (const readPath of readPaths) {
      if (readPath.endsWith(".radix.tsx")) {
        findings.add(
          `${payload.name}: base registry pass read radix variant path ${readPath}`,
        );
      }
    }
  }

  throwIfFindings("Invalid base registry source reads:", findings);
}

export function validateVariantTreesDiffer(
  radixBuilt: BuiltRegistryPayload[],
  baseBuilt: BuiltRegistryPayload[],
) {
  const baseByName = new Map(
    baseBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const radix of radixBuilt) {
    if (radix.radixVariantOutputPaths.length === 0) continue;

    const base = baseByName.get(radix.payload.name);
    if (!base) {
      findings.add(
        `${radix.payload.name}: radix variant exists but base payload is missing`,
      );
      continue;
    }

    for (const filePath of radix.radixVariantOutputPaths) {
      const radixContent = radix.sourceContentsByOutputPath.get(filePath);
      const baseContent = base.sourceContentsByOutputPath.get(filePath);

      if (radixContent === undefined || baseContent === undefined) {
        findings.add(
          `${radix.payload.name}: missing source content for ${filePath} while comparing radix and base trees`,
        );
        continue;
      }

      if (radixContent === baseContent) {
        findings.add(
          `${radix.payload.name}: radix and base sources for ${filePath} are identical despite a .radix.tsx variant`,
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
  const baseByName = new Map(
    baseBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const radix of radixBuilt) {
    if (radix.radixVariantOutputPaths.length === 0) continue;

    const base = baseByName.get(radix.payload.name);
    if (!base) {
      findings.add(
        `${radix.payload.name}: radix variant exists but base payload is missing`,
      );
      continue;
    }

    for (const filePath of radix.radixVariantOutputPaths) {
      const radixContent = radix.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;
      const baseContent = base.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;

      if (radixContent === undefined || baseContent === undefined) {
        findings.add(
          `${radix.payload.name}: missing emitted content for ${filePath} while comparing radix and base slots`,
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
          `${radix.payload.name}: data-slot attributes differ for ${filePath} (${formatSetDifference(onlyInRadix, onlyInBase)})`,
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
  const baseByName = new Map(
    baseBuilt.map((built) => [built.payload.name, built]),
  );
  const findings = new Set<string>();

  for (const radix of radixBuilt) {
    if (radix.radixVariantOutputPaths.length === 0) continue;

    const base = baseByName.get(radix.payload.name);
    if (!base) {
      findings.add(
        `${radix.payload.name}: radix variant exists but base payload is missing`,
      );
      continue;
    }

    for (const filePath of radix.radixVariantOutputPaths) {
      const radixContent = radix.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;
      const baseContent = base.payload.files?.find(
        (file) => file.path === filePath,
      )?.content;

      if (radixContent === undefined || baseContent === undefined) {
        findings.add(
          `${radix.payload.name}: missing emitted content for ${filePath} while comparing radix and base exports`,
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
          `${radix.payload.name}: exported symbols differ for ${filePath} (${formatSetDifference(onlyInRadix, onlyInBase)})`,
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

const CSS_SELECTOR_COMPONENT_RE = /\[data-aui="([a-z-]+)"\]/;
const CSS_SELECTOR_ATTRIBUTE_VALUE_RE = /\[data-aui-([a-z]+)="([^"]*)"\]/g;

/**
 * Walks a generative-ui CSS ruleset and collects every `[data-aui-<attr>="<value>"]`
 * value-selector, keyed by `<component>:<attribute>` (the component read from the
 * same comma-separated selector branch). Presence-only boolean selectors like
 * `[data-aui-flush]` carry no `="value"` and are not matched, by design.
 */
export function collectAttributeSelectorValues(
  css: Record<string, unknown>,
): Map<string, Set<string>> {
  const values = new Map<string, Set<string>>();

  const visitSelectorKey = (selectorKey: string) => {
    for (const rawBranch of selectorKey.split(",")) {
      const branch = rawBranch.trim();
      const component = CSS_SELECTOR_COMPONENT_RE.exec(branch)?.[1];
      if (!component) continue;
      for (const match of branch.matchAll(CSS_SELECTOR_ATTRIBUTE_VALUE_RE)) {
        const key = `${component}:${match[1]}`;
        const set = values.get(key) ?? new Set<string>();
        set.add(match[2]);
        values.set(key, set);
      }
    }
  };

  for (const [selectorKey, rule] of Object.entries(css)) {
    visitSelectorKey(selectorKey);
    const nestedKeys = isDeclarationBlock(
      rule as CssDeclarationBlock | CssMediaBlock,
    )
      ? []
      : Object.keys(rule as CssMediaBlock);
    for (const nestedKey of nestedKeys) visitSelectorKey(nestedKey);
  }

  return values;
}

function getAssistantRegistryDependencyName(dependency: string) {
  return ASSISTANT_REGISTRY_DEPENDENCY_RE.exec(dependency)?.[1] ?? null;
}

/**
 * Inlines the files and dependencies of `bundledRegistryDependencies` into the item.
 *
 * A consumer that resolves items without a full shadcn project config, as the
 * Eve CLI does when it passes only `package.json#registries`, rejects every
 * item in the resolved tree that is not `registry:item` or `registry:file` with
 * a target on each file. Referencing the shared component items is therefore
 * unavailable to such an item, and bundling keeps one declaration in the
 * manifest as the source of truth for both shapes.
 */
export function expandBundledRegistryDependencies(
  item: RegistryItem,
  itemsByName: Map<string, RegistryItem>,
  flavor: UiFlavor,
): RegistryItem {
  const { bundledRegistryDependencies, ...rest } = item;
  if (!bundledRegistryDependencies) return rest;

  const bundled: RegistryItem[] = [];
  const uiPrimitives = new Set<string>();
  const seen = new Set<string>();

  const walk = (dependencies: string[]) => {
    for (const dependency of dependencies) {
      const name = getAssistantRegistryDependencyName(dependency);

      if (!name) {
        if (dependency.startsWith("http")) {
          throw new Error(
            `${item.name}: bundled closure depends on foreign registry item "${dependency}", which cannot be inlined`,
          );
        }
        uiPrimitives.add(dependency);
        continue;
      }

      if (seen.has(name)) continue;
      seen.add(name);

      const dependencyItem = itemsByName.get(name);
      if (!dependencyItem) {
        throw new Error(
          `${item.name}: bundled registry dependency "${dependency}" does not match a local registry item`,
        );
      }

      bundled.push(dependencyItem);
      walk([
        ...(dependencyItem.registryDependencies ?? []),
        ...(flavor === "base"
          ? (dependencyItem.baseRegistryDependencies ?? [])
          : []),
      ]);
    }
  };

  walk(bundledRegistryDependencies);

  const files: RegistryFile[] = [
    ...(rest.files ?? []),
    ...bundled.flatMap((dependencyItem) =>
      (dependencyItem.files ?? []).map((file) => ({
        ...file,
        type: "registry:file" as const,
        target: file.target ?? file.path,
      })),
    ),
    ...[...uiPrimitives].sort().map((name) => ({
      type: "registry:file" as const,
      path: `components/ui/${name}.tsx`,
      sourcePath: `${UI_PRIMITIVE_SOURCE_ROOT}/${flavor}/${name}.tsx`,
      target: `components/ui/${name}.tsx`,
    })),
  ];

  const collectPackages = (
    key: "dependencies" | "radixDependencies" | "baseDependencies",
  ) => [
    ...new Set([
      ...(rest[key] ?? []),
      ...bundled.flatMap((dependencyItem) => dependencyItem[key] ?? []),
    ]),
  ];

  const dependencies = collectPackages("dependencies");
  const radixDependencies = collectPackages("radixDependencies");
  const baseDependencies = collectPackages("baseDependencies");

  if (uiPrimitives.size > 0) {
    const flavorDependencies =
      flavor === "radix" ? radixDependencies : baseDependencies;
    const flavorPackage = UI_PRIMITIVE_PACKAGE[flavor];
    if (!flavorDependencies.includes(flavorPackage)) {
      flavorDependencies.push(flavorPackage);
    }
  }

  const css: Record<string, unknown> = {};
  for (const dependencyItem of bundled) Object.assign(css, dependencyItem.css);
  Object.assign(css, rest.css);

  const cssVars: NonNullable<RegistryItem["cssVars"]> = {};
  for (const scope of ["light", "dark", "theme"] as const) {
    const scopeVars: Record<string, string> = {};
    for (const dependencyItem of bundled) {
      Object.assign(scopeVars, dependencyItem.cssVars?.[scope]);
    }
    Object.assign(scopeVars, rest.cssVars?.[scope]);
    if (Object.keys(scopeVars).length > 0) cssVars[scope] = scopeVars;
  }

  return {
    ...rest,
    files,
    ...(dependencies.length > 0 ? { dependencies } : {}),
    ...(radixDependencies.length > 0 ? { radixDependencies } : {}),
    ...(baseDependencies.length > 0 ? { baseDependencies } : {}),
    ...(Object.keys(css).length > 0 ? { css } : {}),
    ...(Object.keys(cssVars).length > 0 ? { cssVars } : {}),
  };
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
  if (filePath.endsWith(".vue")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".tsx")) return ts.ScriptKind.TSX;
  if (filePath.endsWith(".jsx")) return ts.ScriptKind.JSX;
  if (filePath.endsWith(".ts")) return ts.ScriptKind.TS;
  if (filePath.endsWith(".js")) return ts.ScriptKind.JS;
  return ts.ScriptKind.Unknown;
}

function getVueScriptLanguage(attributes: string) {
  const match = attributes.match(
    /(?:^|\s)lang\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/i,
  );
  return match?.[1] ?? match?.[2] ?? match?.[3];
}

function getScriptContents(file: RegistryOutputFile) {
  if (!file.path.endsWith(".vue")) return [{ content: file.content }];

  return [
    ...file.content.matchAll(/<script(\s[^>]*)?>([\s\S]*?)<\/script\b[^>]*>/gi),
  ].map((match) => ({
    content: match[2] ?? "",
    lang: getVueScriptLanguage(match[1] ?? ""),
  }));
}

function collectModuleSpecifiers(file: RegistryOutputFile) {
  const specifiers = new Set<string>();

  for (const { content } of getScriptContents(file)) {
    const sourceFile = ts.createSourceFile(
      file.path,
      content,
      ts.ScriptTarget.Latest,
      true,
      getScriptKind(file.path),
    );

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
  }

  return specifiers;
}

function getLocalComponentCandidates(specifier: string) {
  if (
    !specifier.startsWith("@/components/") &&
    !specifier.startsWith("@/hooks/")
  )
    return null;

  const componentPath = specifier.replace(/[?#].*$/, "").slice(2);
  const extension = path.extname(componentPath);
  if (EXPLICIT_EXTENSIONS.has(extension.toLowerCase())) return [componentPath];
  if (!extension)
    return MODULE_EXTENSIONS.map(
      (moduleExtension) => `${componentPath}${moduleExtension}`,
    );

  return [
    componentPath,
    ...MODULE_EXTENSIONS.map(
      (moduleExtension) => `${componentPath}${moduleExtension}`,
    ),
    ...MODULE_EXTENSIONS.map(
      (moduleExtension) => `${componentPath}/index${moduleExtension}`,
    ),
  ];
}

const MODULE_EXTENSIONS = [".tsx", ".ts", ".jsx", ".js"];

const EXPLICIT_EXTENSIONS = new Set([
  ...MODULE_EXTENSIONS,
  ".mjs",
  ".cjs",
  ".mts",
  ".cts",
  ".css",
  ".json",
  ".svg",
  ".png",
  ".jpg",
  ".jpeg",
  ".gif",
  ".webp",
  ".avif",
  ".ico",
  ".woff",
  ".woff2",
  ".ttf",
  ".otf",
  ".md",
  ".mdx",
  ".vue",
  ".txt",
]);

/**
 * The install paths a relative specifier may resolve to once the item is
 * installed. A specifier is satisfied when the install closure provides any one
 * of them, which is what a bundler in the user's project will do: an explicit
 * extension, an extensionless module, a directory index, or the TypeScript
 * source behind a `.js` specifier. A dot in a basename is only treated as an
 * explicit extension when it is one of the recognized module or asset
 * extensions; a dotted module name (`./tool.config`) keeps the literal
 * candidate and probes module and index forms too. `null` means the specifier
 * points outside the installed tree, where no closure file can ever satisfy
 * it.
 */
export function getRelativeImportCandidates(
  specifier: string,
  fromPath: string,
) {
  const modulePath = specifier.replace(/[?#].*$/, "");
  const resolved = path.posix.normalize(
    path.posix.join(path.posix.dirname(fromPath), modulePath),
  );
  if (resolved === ".." || resolved.startsWith("../")) return null;

  const extension = path.posix.extname(resolved).toLowerCase();
  const candidates = new Set<string>();

  if (EXPLICIT_EXTENSIONS.has(extension)) {
    candidates.add(resolved);
    if (extension === ".js" || extension === ".jsx") {
      const base = resolved.slice(0, -extension.length);
      for (const moduleExtension of MODULE_EXTENSIONS) {
        candidates.add(`${base}${moduleExtension}`);
      }
    }
  } else {
    if (extension) candidates.add(resolved);
    for (const moduleExtension of MODULE_EXTENSIONS) {
      candidates.add(`${resolved}${moduleExtension}`);
    }
    for (const moduleExtension of MODULE_EXTENSIONS) {
      candidates.add(`${resolved}/index${moduleExtension}`);
    }
  }

  return [...candidates];
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

  const files = new Set(
    item.files?.map((file) => file.target ?? file.path) ?? [],
  );
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

export function validateRegistryInstallMetadata(
  payloads: RegistryOutputItem[],
) {
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
        const localCandidates = getLocalComponentCandidates(specifier);

        if (localCandidates) {
          if (
            !localCandidates.some((candidate) =>
              installContext.files.has(candidate),
            )
          ) {
            findings.add(
              `${item.name}: ${file.path} imports "${specifier}", but no file or registryDependency provides ${localCandidates.join(" or ")}`,
            );
          }

          continue;
        }

        if (specifier.startsWith(".")) {
          const installedPath = file.target ?? file.path;
          const candidates = getRelativeImportCandidates(
            specifier,
            installedPath,
          );

          if (
            candidates === null ||
            !candidates.some((candidate) => installContext.files.has(candidate))
          ) {
            findings.add(
              `${item.name}: ${installedPath} imports "${specifier}", but no file or registryDependency provides ${
                candidates === null
                  ? "a file outside the installed tree"
                  : candidates.join(" or ")
              }`,
            );
          }

          continue;
        }

        if (specifier.startsWith("@/")) {
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

const UNIVERSAL_TYPES = new Set(["registry:item", "registry:file"]);

/**
 * Holds bundled items to the shape a consumer without a full project config accepts.
 *
 * Bundling only exists to serve that consumer, so an item that bundles and then
 * declares a type or an untargeted file it cannot install is inert. The failure
 * surfaces at install time in the consumer, not here, unless the build rejects it.
 */
export function validateUniversalItems(
  items: RegistryBuildItem[],
  universalNames: Set<string>,
) {
  const findings = new Set<string>();

  for (const item of items) {
    if (!universalNames.has(item.name)) continue;

    if (!UNIVERSAL_TYPES.has(item.type)) {
      findings.add(
        `${item.name}: type "${item.type}" is not installable without a full project config`,
      );
    }

    for (const file of item.files ?? []) {
      if (!file.target || !UNIVERSAL_TYPES.has(file.type)) {
        findings.add(
          `${item.name}: ${file.path} needs an explicit target and a universal file type`,
        );
      }
    }

    for (const dependency of item.registryDependencies ?? []) {
      findings.add(
        `${item.name}: registry dependency "${dependency}" resolves to an item that cannot be installed without a full project config; bundle it instead`,
      );
    }
  }

  throwIfFindings("Invalid universal registry items:", findings);
}

export async function buildRegistry(
  registry: RegistryItem[],
  vueRegistry: RegistryItem[],
) {
  validateRegistrySchema(registry);
  validateRegistrySchema(vueRegistry);

  const universalNames = new Set(
    registry
      .filter(
        (item) =>
          item.bundledRegistryDependencies || UNIVERSAL_TYPES.has(item.type),
      )
      .map((item) => item.name),
  );
  const itemsByName = new Map(registry.map((item) => [item.name, item]));
  const radixRegistry = registry.map((item) =>
    createRadixRegistryItem(
      expandBundledRegistryDependencies(item, itemsByName, "radix"),
    ),
  );
  const baseRegistry = registry.map((item) =>
    createBaseRegistryItem(
      expandBundledRegistryDependencies(item, itemsByName, "base"),
    ),
  );
  validateRegistrySchema(radixRegistry);
  validateRegistrySchema(baseRegistry);
  validateUniversalItems(radixRegistry, universalNames);
  validateUniversalItems(baseRegistry, universalNames);

  const radixBuilt = radixRegistry.map((item) =>
    createRegistryPayload(item, true),
  );
  const baseBuilt = baseRegistry.map((item) =>
    createRegistryPayload(item, false),
  );
  const vueBuilt = vueRegistry.map((item) => createRegistryPayload(item));
  validateBaseVariantContent(radixBuilt, baseBuilt);
  validateBaseTreeRadixImports(baseBuilt);
  validateEmittedSpecifierHygiene([...radixBuilt, ...baseBuilt]);
  validateBasePassDidNotReadRadixSources(baseBuilt);
  validateVariantTreesDiffer(radixBuilt, baseBuilt);
  validateVariantSlotParity(radixBuilt, baseBuilt);
  validateVariantExportParity(radixBuilt, baseBuilt);
  validateStyleScopedDependencies(radixBuilt, baseBuilt);
  validateVueFlavorContent(vueBuilt);

  const payloads = radixBuilt.map((built) => built.payload);
  const basePayloads = baseBuilt.map((built) => built.payload);
  const vuePayloads = vueBuilt.map((built) => built.payload);
  validateRegistryInstallMetadata(payloads);
  validateRegistryInstallMetadata(basePayloads);
  validateRegistryInstallMetadata(vuePayloads);

  await fs.mkdir(REGISTRY_PATH, { recursive: true });
  await fs.mkdir(BASE_REGISTRY_PATH, { recursive: true });
  await fs.mkdir(VUE_REGISTRY_PATH, { recursive: true });

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

  for (const payload of vuePayloads) {
    const p = path.join(VUE_REGISTRY_PATH, `${payload.name}.json`);
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

  await fs.writeFile(
    VUE_REGISTRY_INDEX_PATH,
    JSON.stringify({ ...registryIndex, items: vueRegistry }, null, 2),
    "utf8",
  );
}

const entrypoint = process.argv[1];
if (
  entrypoint &&
  import.meta.url === pathToFileURL(path.resolve(entrypoint)).href
) {
  await buildRegistry(registry, vueRegistry);
}
