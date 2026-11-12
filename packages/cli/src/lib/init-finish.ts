import fs from "node:fs";
import path from "node:path";
import { assertSafeProjectFile } from "./safe-project-file";

/**
 * Follow-up fixes for `assistant-ui init` in an existing project, applied
 * after `shadcn init` and `shadcn add` have run. Each step only touches a
 * file when it can tell the file is still the generated default.
 */

const FONT_KEYS = ["--font-sans", "--font-serif", "--font-mono"] as const;
type FontKey = (typeof FONT_KEYS)[number];
export type FontSnapshot = Partial<Record<FontKey, string>>;

const CSS_CANDIDATES = [
  "app/globals.css",
  "src/app/globals.css",
  "styles/globals.css",
  "src/styles/globals.css",
];

const escapeRegExp = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const declarationPattern = (key: string) =>
  new RegExp(`^([ \\t]*)${escapeRegExp(key)}:[ \\t]*([^;\\n]+);`, "m");

const isSelfReference = (key: string, value: string) =>
  value.replace(/\s+/g, "") === `var(${key})`;

/** Reads the `--font-*` theme values a stylesheet sets before shadcn rewrites it. */
function readFontSnapshot(css: string): FontSnapshot {
  const snapshot: FontSnapshot = {};
  for (const key of FONT_KEYS) {
    const match = css.match(declarationPattern(key));
    const value = match?.[2]?.trim();
    if (value && !isSelfReference(key, value)) snapshot[key] = value;
  }
  return snapshot;
}

export function snapshotProjectFonts(
  projectRoot: string,
): Record<string, FontSnapshot> {
  const snapshots: Record<string, FontSnapshot> = {};
  for (const candidate of CSS_CANDIDATES) {
    try {
      const css = fs.readFileSync(path.join(projectRoot, candidate), "utf8");
      snapshots[candidate] = readFontSnapshot(css);
    } catch {
      // not present
    }
  }
  return snapshots;
}

/** CSS variables the root layout's next/font calls declare, e.g. `--font-geist-sans`. */
function readLayoutFontVariables(layoutSource: string): string[] {
  return [...layoutSource.matchAll(/variable:\s*["'`](--[\w-]+)["'`]/g)].map(
    (match) => match[1]!,
  );
}

const pickLayoutVariable = (key: FontKey, variables: string[]) => {
  const kind = key.slice("--font-".length);
  if (kind === "sans") {
    return variables.find((v) => !/mono|serif/.test(v));
  }
  return variables.find((v) => v.includes(kind));
};

export interface FontRepair {
  key: string;
  value: string | null;
}

/**
 * shadcn writes `--font-sans: var(--font-sans)` into `@theme inline`, which
 * only works when the layout loads a font into `--font-sans`. Anywhere else it
 * is a cycle that drops the project's font. Point it back at what the stylesheet
 * used before, or at the layout's next/font variable, or drop it.
 */
export function repairSelfReferencingFonts(
  css: string,
  snapshot: FontSnapshot,
  layoutVariables: string[],
): { css: string; repairs: FontRepair[] } {
  const repairs: FontRepair[] = [];
  let next = css;
  for (const key of FONT_KEYS) {
    const match = next.match(declarationPattern(key));
    if (!match || !isSelfReference(key, match[2]!)) continue;
    if (layoutVariables.includes(key)) continue;

    const layoutVariable = pickLayoutVariable(key, layoutVariables);
    const value =
      snapshot[key] ?? (layoutVariable ? `var(${layoutVariable})` : null);
    next =
      value === null
        ? next.replace(
            new RegExp(`${declarationPattern(key).source}[ \\t]*\\n?`, "m"),
            "",
          )
        : next.replace(declarationPattern(key), `${match[1]}${key}: ${value};`);
    repairs.push({ key, value });
  }
  return { css: next, repairs };
}

const STARTER_MARKERS = [/utm_source=create-next-app/, /\/next\.svg/];

/** True for the page.tsx create-next-app writes, before anyone edits it. */
function isCreateNextAppStarterPage(source: string): boolean {
  return STARTER_MARKERS.every((marker) => marker.test(source));
}

export const ASSISTANT_PAGE_SOURCE = `import { Assistant } from "./assistant";

export default function Home() {
  return <Assistant />;
}
`;

const CN_ONE_LINER = /^export\s*\{\s*cn\s*\}\s*from\s*["']cn["'];?\s*$/;

export const CN_UTILS_SOURCE = `// \`cn\` is shadcn's class name helper: clsx + tailwind-merge in one package
// (https://github.com/shadcn-ui/cn). shadcn/ui components import it directly,
// so keep the \`cn\` dependency installed.
export { cn } from "cn"
`;

export interface InitFinishResult {
  fontRepairs: FontRepair[];
  cssPath?: string;
  page:
    | { status: "replaced"; pagePath: string }
    | { status: "kept"; pagePath: string; assistantPath: string }
    | { status: "no-assistant" };
  cnExplained: boolean;
  usesCnPackage: boolean;
}

const readJson = (file: string): Record<string, unknown> | undefined => {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as Record<string, unknown>;
  } catch {
    return undefined;
  }
};

const readText = (file: string) => {
  try {
    return fs.readFileSync(file, "utf8");
  } catch {
    return undefined;
  }
};

const writeProjectFile = (projectRoot: string, rel: string, data: string) => {
  const file = path.join(projectRoot, rel);
  assertSafeProjectFile(file, projectRoot);
  fs.writeFileSync(file, data);
};

const findFirst = (projectRoot: string, candidates: string[]) =>
  candidates.find((rel) => fs.existsSync(path.join(projectRoot, rel)));

export function finishExistingProjectInit(
  projectRoot: string,
  fontSnapshots: Record<string, FontSnapshot>,
): InitFinishResult {
  const config = readJson(path.join(projectRoot, "components.json"));
  const tailwind = config?.tailwind as { css?: unknown } | undefined;
  const cssPath =
    typeof tailwind?.css === "string" && tailwind.css
      ? path.normalize(tailwind.css).split(path.sep).join("/")
      : undefined;

  const appDir = findFirst(projectRoot, ["app", "src/app"]);

  // 1. fonts
  let fontRepairs: FontRepair[] = [];
  const css = cssPath ? readText(path.join(projectRoot, cssPath)) : undefined;
  if (cssPath && css !== undefined) {
    const layoutRel = appDir
      ? findFirst(projectRoot, [
          `${appDir}/layout.tsx`,
          `${appDir}/layout.jsx`,
          `${appDir}/layout.js`,
        ])
      : undefined;
    const layout = layoutRel
      ? (readText(path.join(projectRoot, layoutRel)) ?? "")
      : "";
    const result = repairSelfReferencingFonts(
      css,
      fontSnapshots[cssPath] ?? {},
      readLayoutFontVariables(layout),
    );
    if (result.repairs.length > 0) {
      writeProjectFile(projectRoot, cssPath, result.css);
      fontRepairs = result.repairs;
    }
  }

  // 2. render <Assistant /> on the home page
  let page: InitFinishResult["page"] = { status: "no-assistant" };
  const assistantRel = appDir
    ? findFirst(projectRoot, [
        `${appDir}/assistant.tsx`,
        `${appDir}/assistant.jsx`,
      ])
    : undefined;
  if (appDir && assistantRel) {
    const pageRel =
      findFirst(projectRoot, [
        `${appDir}/page.tsx`,
        `${appDir}/page.jsx`,
        `${appDir}/page.js`,
      ]) ?? `${appDir}/page.tsx`;
    const pageSource = readText(path.join(projectRoot, pageRel));
    if (
      pageSource !== undefined &&
      isCreateNextAppStarterPage(pageSource) &&
      path.extname(pageRel) === path.extname(assistantRel)
    ) {
      writeProjectFile(projectRoot, pageRel, ASSISTANT_PAGE_SOURCE);
      page = { status: "replaced", pagePath: pageRel };
    } else {
      page = { status: "kept", pagePath: pageRel, assistantPath: assistantRel };
    }
  }

  // 3. explain the `cn` dependency where people look for it
  let cnExplained = false;
  const utilsRel = findFirst(projectRoot, ["lib/utils.ts", "src/lib/utils.ts"]);
  if (utilsRel) {
    const utils = readText(path.join(projectRoot, utilsRel)) ?? "";
    if (CN_ONE_LINER.test(utils)) {
      writeProjectFile(projectRoot, utilsRel, CN_UTILS_SOURCE);
      cnExplained = true;
    }
  }

  const pkg = readJson(path.join(projectRoot, "package.json"));
  const usesCnPackage = [pkg?.dependencies, pkg?.devDependencies].some(
    (deps) =>
      typeof deps === "object" && deps !== null && Object.hasOwn(deps, "cn"),
  );

  return {
    fontRepairs,
    ...(cssPath ? { cssPath } : {}),
    page,
    cnExplained,
    usesCnPackage,
  };
}

/** The lines `assistant-ui init` prints once everything is installed. */
export function describeInitFinish(result: InitFinishResult): string[] {
  const lines: string[] = [];
  if (result.page.status === "replaced") {
    lines.push(
      `${result.page.pagePath} now renders <Assistant />. Run the dev server and open /.`,
    );
  } else if (result.page.status === "kept") {
    const from = path.posix.relative(
      path.posix.dirname(result.page.pagePath),
      result.page.assistantPath.replace(/\.[jt]sx$/, ""),
    );
    const specifier = from.startsWith(".") ? from : `./${from}`;
    lines.push(
      `Next step: render <Assistant /> (import { Assistant } from "${specifier}") in ${result.page.pagePath} or any page.`,
    );
  }
  lines.push(
    "TooltipProvider: not needed. assistant-ui components include their own, so skip the layout change shadcn suggests above.",
  );
  for (const repair of result.fontRepairs) {
    lines.push(
      repair.value
        ? `Kept your font: ${repair.key} now points at ${repair.value} in ${result.cssPath}.`
        : `Removed a self-referencing ${repair.key} from ${result.cssPath}.`,
    );
  }
  if (result.usesCnPackage) {
    lines.push(
      "The `cn` dependency is shadcn's class name helper (clsx + tailwind-merge). shadcn components import it, so keep it.",
    );
  }
  return lines;
}
