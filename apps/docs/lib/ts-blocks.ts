// Type-checks the TypeScript code blocks in the docs against the workspace's
// built packages. Blocks on one page build on each other, so a block may use
// any name an earlier block on the page imports or declares, unless both are
// titled as different files. A title is a file path: an import of `./x` or
// `@/x` reaches the block titled with that path. Imports of the reader's own
// files that no block shows type as `any`; so do packages the workspace
// doesn't install. A fence whose meta says `fragment` is skipped.
import { execFile } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { ts } from "ts-morph";

const ROOT = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../../..",
);
const DOCS = path.join(ROOT, "apps/docs");

export type TsBlock = {
  page: string;
  /** 1-based line of the block's first code line in the page */
  line: number;
  lang: "ts" | "tsx";
  title?: string;
  fragment: boolean;
  code: string;
};

export type TsBlockResult = TsBlock & {
  /** `line:col TSnnnn message`, lines relative to the page */
  errors: string[];
};

const FENCE = /^(\s*)(`{3,}|~{3,})\s*([\w-]*)(.*)$/;

export function extractTsBlocks(page: string, source: string): TsBlock[] {
  const lines = source.split("\n");
  const blocks: TsBlock[] = [];
  for (let i = 0; i < lines.length; i++) {
    const open = FENCE.exec(lines[i]!);
    if (!open) continue;
    const [, indent, fence, lang, meta] = open as unknown as string[];
    const body: string[] = [];
    let j = i + 1;
    for (; j < lines.length; j++) {
      const line = lines[j]!;
      const trimmed = line.trim();
      if (
        trimmed.startsWith(fence![0]!.repeat(fence!.length)) &&
        /^[`~]+$/.test(trimmed) &&
        trimmed[0] === fence![0]
      )
        break;
      body.push(line.startsWith(indent!) ? line.slice(indent!.length) : line);
    }
    const kind =
      lang === "tsx"
        ? "tsx"
        : lang === "ts" || lang === "typescript"
          ? "ts"
          : undefined;
    if (kind) {
      const title = /title="([^"]+)"/.exec(meta!)?.[1];
      blocks.push({
        page,
        line: i + 2,
        lang: kind,
        ...(title ? { title } : {}),
        fragment: /(^|\s)fragment(\s|$)/.test(meta!),
        code: body.join("\n"),
      });
    }
    i = j;
  }
  return blocks;
}

type Names = {
  /** syntax errors, which stop tsc before it checks types */
  syntax: string[];
  /** names the block declares at top level */
  declared: Set<string>;
  /** local name -> the import clause that binds only that name */
  imported: Map<string, { clause: string; specifier: string }>;
  /** names already exported under their own name */
  exported: Set<string>;
  /** every identifier the block mentions */
  used: Set<string>;
  /** module specifiers with the names imported from each */
  specifiers: { specifier: string; names: string[]; isDefault: boolean }[];
};

/** API references show signatures (`const useX: () => T;`, `function f(): T;`).
 *  Declaring them lets their types be checked; line numbers stay the same. */
function declareSignatures(block: TsBlock) {
  const sf = ts.createSourceFile(
    `b.${block.lang}`,
    block.code,
    ts.ScriptTarget.Latest,
    true,
    block.lang === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const at: number[] = [];
  for (const statement of sf.statements) {
    const declared = (
      ts.canHaveModifiers(statement) ? (ts.getModifiers(statement) ?? []) : []
    ).some((m) => m.kind === ts.SyntaxKind.DeclareKeyword);
    if (declared) continue;
    const signature =
      (ts.isVariableStatement(statement) &&
        statement.declarationList.declarations.every(
          (d) => !d.initializer && d.type,
        )) ||
      (ts.isFunctionDeclaration(statement) && !statement.body);
    if (!signature) continue;
    // after `export`, if any
    const exported = (ts.getModifiers(statement) ?? []).find(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    );
    at.push(exported ? exported.getEnd() + 1 : statement.getStart(sf));
  }
  let code = block.code;
  for (const position of at.reverse())
    code = `${code.slice(0, position)}declare ${code.slice(position)}`;
  return { ...block, code };
}

function readNames(block: TsBlock): Names {
  const sf = ts.createSourceFile(
    `b.${block.lang}`,
    block.code,
    ts.ScriptTarget.Latest,
    true,
    block.lang === "tsx" ? ts.ScriptKind.TSX : ts.ScriptKind.TS,
  );
  const names: Names = {
    syntax: (
      (sf as unknown as { parseDiagnostics: ts.Diagnostic[] })
        .parseDiagnostics ?? []
    ).map((d) => {
      const { line, character } = sf.getLineAndCharacterOfPosition(
        d.start ?? 0,
      );
      return `${block.line + line}:${character + 1} TS${d.code} ${ts.flattenDiagnosticMessageText(d.messageText, " ")}`;
    }),
    declared: new Set(),
    imported: new Map(),
    exported: new Set(),
    used: new Set(),
    specifiers: [],
  };
  const bind = (name: ts.BindingName) => {
    if (ts.isIdentifier(name)) names.declared.add(name.text);
    else
      for (const element of name.elements)
        if (!ts.isOmittedExpression(element)) bind(element.name);
  };
  const isExported = (node: ts.Node) =>
    ts.canHaveModifiers(node) &&
    (ts.getModifiers(node) ?? []).some(
      (m) => m.kind === ts.SyntaxKind.ExportKeyword,
    ) &&
    !(ts.getModifiers(node) ?? []).some(
      (m) => m.kind === ts.SyntaxKind.DefaultKeyword,
    );
  for (const statement of sf.statements) {
    if (ts.isImportDeclaration(statement)) {
      const specifier = (statement.moduleSpecifier as ts.StringLiteral).text;
      const clause = statement.importClause;
      const typeOnly = clause?.isTypeOnly ? "type " : "";
      const imported: string[] = [];
      let isDefault = false;
      if (clause?.name) {
        names.imported.set(clause.name.text, {
          clause: `${typeOnly}${clause.name.text}`,
          specifier,
        });
        isDefault = true;
      }
      const bindings = clause?.namedBindings;
      if (bindings && ts.isNamespaceImport(bindings))
        names.imported.set(bindings.name.text, {
          clause: `${typeOnly}* as ${bindings.name.text}`,
          specifier,
        });
      if (bindings && ts.isNamedImports(bindings))
        for (const element of bindings.elements) {
          const original = (element.propertyName ?? element.name).text;
          imported.push(original);
          names.imported.set(element.name.text, {
            clause: `{ ${typeOnly}${element.isTypeOnly ? "type " : ""}${
              original === element.name.text
                ? original
                : `${original} as ${element.name.text}`
            } }`,
            specifier,
          });
        }
      names.specifiers.push({ specifier, names: imported, isDefault });
      continue;
    }
    if (ts.isVariableStatement(statement)) {
      for (const declaration of statement.declarationList.declarations) {
        bind(declaration.name);
        if (isExported(statement)) {
          const before = new Set(names.declared);
          bind(declaration.name);
          for (const name of before) names.exported.add(name);
        }
      }
      continue;
    }
    if (
      (ts.isFunctionDeclaration(statement) ||
        ts.isClassDeclaration(statement) ||
        ts.isInterfaceDeclaration(statement) ||
        ts.isTypeAliasDeclaration(statement) ||
        ts.isEnumDeclaration(statement) ||
        (ts.isModuleDeclaration(statement) &&
          ts.isIdentifier(statement.name))) &&
      statement.name
    ) {
      const name = (statement.name as ts.Identifier).text;
      names.declared.add(name);
      if (isExported(statement)) names.exported.add(name);
      continue;
    }
    if (ts.isExportDeclaration(statement) && !statement.moduleSpecifier) {
      const clause = statement.exportClause;
      if (clause && ts.isNamedExports(clause))
        for (const element of clause.elements)
          names.exported.add(element.name.text);
    }
  }
  // a property name (`a.name`, `{ name: 1 }`, `<X name />`) isn't a use
  const isPropertyName = (node: ts.Identifier) => {
    const parent = node.parent;
    return (
      ((ts.isPropertyAccessExpression(parent) || ts.isQualifiedName(parent)) &&
        (ts.isPropertyAccessExpression(parent)
          ? parent.name === node
          : parent.right === node)) ||
      ((ts.isPropertyAssignment(parent) ||
        ts.isPropertySignature(parent) ||
        ts.isPropertyDeclaration(parent) ||
        ts.isMethodDeclaration(parent) ||
        ts.isMethodSignature(parent) ||
        ts.isJsxAttribute(parent)) &&
        parent.name === node)
    );
  };
  const visit = (node: ts.Node) => {
    if (ts.isIdentifier(node) && !isPropertyName(node))
      names.used.add(node.text);
    ts.forEachChild(node, visit);
  };
  visit(sf);
  return names;
}

const isBare = (specifier: string) =>
  !specifier.startsWith(".") &&
  !specifier.startsWith("/") &&
  !specifier.startsWith("@/") &&
  !specifier.startsWith("~/");

const packageName = (specifier: string) =>
  specifier.startsWith("@")
    ? specifier.split("/").slice(0, 2).join("/")
    : specifier.split("/")[0]!;

function workspacePackages() {
  const found = new Map<string, string>();
  for (const group of ["packages", "examples", "templates", "apps"]) {
    const dir = path.join(ROOT, group);
    if (!existsSync(dir)) continue;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const manifest = path.join(dir, entry.name, "package.json");
      if (!existsSync(manifest)) continue;
      const { name } = JSON.parse(readFileSync(manifest, "utf8"));
      if (name && !found.has(name)) found.set(name, path.join(dir, entry.name));
    }
  }
  return found;
}

/** Workspace packages CI builds before the docs tests: the docs site's
 *  workspace dependencies, transitively. */
function docsBuildClosure(workspace: Map<string, string>) {
  const seen = new Set<string>();
  const queue = ["@assistant-ui/docs-site"];
  while (queue.length) {
    const name = queue.pop()!;
    if (seen.has(name) || !workspace.has(name)) continue;
    seen.add(name);
    const manifest = JSON.parse(
      readFileSync(path.join(workspace.get(name)!, "package.json"), "utf8"),
    );
    for (const field of ["dependencies", "devDependencies", "peerDependencies"])
      for (const [dep, version] of Object.entries(manifest[field] ?? {}))
        if (String(version).startsWith("workspace:")) queue.push(dep);
  }
  return seen;
}

type Location = "docs" | { link: string } | { src: string } | undefined;

/** Finds an installed copy of a package: the docs site's; a workspace
 *  package, built if CI builds it before the docs tests and as source if not;
 *  or one a workspace member installs. */
function locatePackage(
  name: string,
  workspace: Map<string, string>,
  closure: Set<string>,
): Location {
  if (existsSync(path.join(DOCS, "node_modules", name, "package.json")))
    return "docs";
  if (workspace.has(name))
    return closure.has(name)
      ? { link: workspace.get(name)! }
      : { src: path.join(workspace.get(name)!, "src") };
  for (const member of workspace.values()) {
    const candidate = path.join(member, "node_modules", name);
    if (existsSync(path.join(candidate, "package.json")))
      return { link: candidate };
  }
  for (const member of workspace.values()) {
    const types = path.join(
      member,
      "node_modules/@types",
      name.startsWith("@") ? name.slice(1).replace("/", "__") : name,
    );
    if (existsSync(path.join(types, "package.json"))) return { link: types };
  }
  return undefined;
}

const slug = (page: string) =>
  page
    .replace(/^apps\/docs\/content\//, "")
    .replace(/\.mdx?$/, "")
    .replace(/[^\w/-]+/g, "_");

const EXTENSIONS = [".tsx", ".ts", "/index.tsx", "/index.ts", ""];

/** Names the reader supplies: their model, client and app code. One list
 *  for every page; a name here is defined on every page. */
export const READER_SUPPLIED = `
import type { LanguageModel } from "ai";
import type { FC } from "react";
import type {
  AssistantClient,
  AssistantRuntime,
  ToolCallMessagePartComponent,
} from "@assistant-ui/react";
import type { AssistantCloud } from "assistant-cloud";
declare global {
  /** the reader's model, e.g. openai("gpt-5") */
  const model: LanguageModel;
  /** the client from useAui() */
  const aui: AssistantClient;
  /** the reader's AssistantCloud instance */
  const cloud: AssistantCloud;
  /** the runtime from a use…Runtime() hook */
  const runtime: AssistantRuntime;
  /** components \`npx assistant-ui add\` puts in the reader's project */
  const Thread: FC;
  const ThreadList: FC;
  const MarkdownText: FC;
  const ToolFallback: ToolCallMessagePartComponent;
  const Reasoning: FC<any>;
  const TooltipIconButton: FC<any>;
}
export {};
`;

// React names a block may use without importing them, as an editor would
// add the import.
const REACT_NAMES = new Set([
  "useState",
  "useEffect",
  "useMemo",
  "useCallback",
  "useRef",
  "useContext",
  "useReducer",
  "useLayoutEffect",
  "useId",
  "useSyncExternalStore",
  "useTransition",
  "createContext",
  "forwardRef",
  "memo",
  "Fragment",
  "FC",
  "ReactNode",
  "ComponentType",
  "PropsWithChildren",
  "ComponentProps",
  "ComponentPropsWithoutRef",
  "CSSProperties",
]);

/** Root exports of every package with an `api-surface/` file. */
function packageExports() {
  const surface = path.join(ROOT, "api-surface");
  const exports = new Map<string, Set<string>>();
  for (const file of readdirSync(surface)) {
    if (!file.endsWith(".ts")) continue;
    const name = file.replace(/\.ts$/, "").replace(/^([\w-]+)__/, "@$1/");
    const text = readFileSync(path.join(surface, file), "utf8");
    const root =
      /declare namespace entry_root_exports \{\s*export \{([^}]*)\}/.exec(text);
    if (!root) continue;
    exports.set(
      name,
      new Set(
        root[1]!
          .split(",")
          .map((part) =>
            part
              .trim()
              .split(/\s+as\s+/)
              .pop()!,
          )
          .filter(Boolean),
      ),
    );
  }
  return exports;
}

const SECTION_PACKAGES: [RegExp, string][] = [
  [/\/react-native\//, "@assistant-ui/react-native"],
  [/\/vue\//, "@assistant-ui/vue"],
  [/\/ink\//, "@assistant-ui/react-ink"],
];

const NATIVE_PAGES = /\/react-native\/|\/examples\/expo\.mdx$/;

const UNRESOLVED = /TS(2304|2552|2503|18004) [^']*'([^']+)'/;

type Prepared = {
  block: TsBlock;
  file: string;
  text: string;
  /** bare packages the page imports, in order */
  pagePackages: string[];
  /** the tsc program: pages that augment a module get their own */
  program: string;
};

export async function checkTsBlocks(
  pages: string[],
  /** reads a page; another revision's text for a before/after measure */
  read: (page: string) => string = (page) =>
    readFileSync(path.join(ROOT, page), "utf8"),
): Promise<{
  results: (TsBlockResult & { implicitImports: string[] })[];
  /** errors outside the blocks: a bug in this checker */
  checkerErrors: string[];
  /** packages no workspace member installs; their imports are `any` */
  unresolvable: string[];
  /** reader files no block shows; their imports are `any` */
  stubs: string[];
  ms: number;
}> {
  const started = Date.now();
  const dir = path.join(DOCS, "node_modules/.cache/docs-ts-blocks");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const workspace = workspacePackages();
  const closure = docsBuildClosure(workspace);
  const located = new Map<string, Location>();
  const unresolvable = new Set<string>();
  // specifiers of packages nobody installs -> the names imported from each
  const missingModules = new Map<
    string,
    { names: Set<string>; isDefault: boolean }
  >();
  const all: TsBlock[] = [];
  const prepared = new Map<string, Prepared>();
  const syntaxErrors = new Map<TsBlock, string[]>();
  const stubs = new Map<string, { names: Set<string>; isDefault: boolean }>();
  const toImport = (from: string, to: string) => {
    const rel = path
      .relative(path.dirname(from), to)
      .replace(/\.(tsx?|mts|cts)$/, "");
    return rel.startsWith(".") ? rel : `./${rel}`;
  };

  for (const page of pages) {
    const blocks = extractTsBlocks(page, read(page));
    all.push(...blocks);
    const pageDir = path.join(dir, "pages", slug(page));
    const parsed = blocks
      .filter((b) => !b.fragment)
      .map((block) => ({ block, names: readNames(declareSignatures(block)) }));
    for (const { block, names } of parsed)
      if (names.syntax.length) syntaxErrors.set(block, names.syntax);
    const valid = parsed.filter(({ names }) => !names.syntax.length);
    const checked = valid.map(({ block }) => block);
    const names = valid.map(({ names }) => names);
    // React Native pages resolve packages as Metro does
    const native = NATIVE_PAGES.test(page);
    const program = valid.some(({ block }) =>
      /^\s*declare (module|global)\b/m.test(block.code),
    )
      ? `${native ? "native__" : ""}${slug(page).replace(/\//g, "__")}`
      : native
        ? "native"
        : "main";
    const pagePackages = [
      ...new Set(
        names.flatMap((n) =>
          n.specifiers
            .filter((s) => isBare(s.specifier))
            .map((s) => s.specifier),
        ),
      ),
    ];
    const used = new Set<string>();
    const titles = new Map<string, string>(); // title without extension -> file
    const fileOf = checked.map((block, i) => {
      let rel = block.title
        ? block.title.replace(/^\/+/, "")
        : `__block${i}.${block.lang}`;
      if (!/\.(tsx?|mts|cts)$/.test(rel)) rel = `${rel}.__${i}.${block.lang}`;
      let file = path.join(pageDir, rel);
      if (used.has(file)) file = file.replace(/(\.\w+)$/, `.__${i}$1`);
      else if (block.title)
        titles.set(rel.replace(/\.(tsx?|mts|cts)$/, ""), file);
      used.add(file);
      return file;
    });
    // names each block exports for the blocks after it
    const exportsOf = checked.map(() => new Set<string>());
    // relative and `@/` specifiers -> the file each resolved to
    const resolvedOf = checked.map(() => new Map<string, string>());
    const bodies = checked.map((block, i) => {
      const own = names[i]!;
      const carried: string[] = [];
      const providers = new Map<
        string,
        { from: number; clause?: string; specifier?: string }
      >();
      for (let j = 0; j < i; j++) {
        const other = checked[j]!;
        if (block.title && other.title && block.title !== other.title) continue;
        for (const [name, { clause, specifier }] of names[j]!.imported)
          providers.set(name, { from: j, clause, specifier });
        for (const name of names[j]!.declared) providers.set(name, { from: j });
      }
      for (const [name, provider] of providers) {
        if (!own.used.has(name)) continue;
        if (own.declared.has(name) || own.imported.has(name)) continue;
        if (provider.clause) {
          // a reader file resolves from the block that imported it
          const target = resolvedOf[provider.from]!.get(provider.specifier!);
          const from = target
            ? toImport(fileOf[i]!, target)
            : provider.specifier!;
          carried.push(
            `import ${provider.clause} from ${JSON.stringify(from)};`,
          );
        } else {
          exportsOf[provider.from]!.add(name);
          carried.push(
            `import { ${name} } from ${JSON.stringify(toImport(fileOf[i]!, fileOf[provider.from]!))};`,
          );
        }
      }
      // point `./x` and `@/x` at the page block titled x, or at a stub
      let code = declareSignatures(block).code;
      for (const { specifier, names: imported, isDefault } of own.specifiers) {
        if (isBare(specifier)) {
          if (specifier.startsWith("node:")) continue;
          const name = packageName(specifier);
          if (!located.has(name))
            located.set(name, locatePackage(name, workspace, closure));
          if (!located.get(name)) {
            unresolvable.add(name);
            const stub = missingModules.get(specifier) ?? {
              names: new Set<string>(),
              isDefault: false,
            };
            for (const n of imported) stub.names.add(n);
            stub.isDefault ||= isDefault;
            missingModules.set(specifier, stub);
          }
          continue;
        }
        const target =
          specifier.startsWith("@/") || specifier.startsWith("~/")
            ? path.join(pageDir, specifier.slice(2))
            : path.resolve(path.dirname(fileOf[i]!), specifier);
        const relTarget = path.relative(pageDir, target);
        const titled = EXTENSIONS.map((ext) =>
          titles.get((relTarget + ext).replace(/\.(tsx?|mts|cts)$/, "")),
        ).find(Boolean);
        const resolved =
          titled ??
          path.join(dir, "stubs", relTarget.replace(/\.\.\//g, "up/"));
        if (!titled) {
          const stub = stubs.get(resolved) ?? {
            names: new Set(),
            isDefault: false,
          };
          for (const n of imported) stub.names.add(n);
          stub.isDefault ||= isDefault;
          stubs.set(resolved, stub);
        }
        resolvedOf[i]!.set(specifier, resolved);
        code = code.replace(
          new RegExp(
            `(["'])${specifier.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\1`,
            "g",
          ),
          JSON.stringify(toImport(fileOf[i]!, resolved)),
        );
      }
      return { code, carried };
    });
    checked.forEach((block, i) => {
      const exports = [...exportsOf[i]!].filter(
        (n) => !names[i]!.exported.has(n),
      );
      const text = [
        bodies[i]!.code,
        // imports and exports are hoisted, so appending them keeps the
        // block's line numbers
        ...bodies[i]!.carried,
        exports.length ? `export { ${exports.join(", ")} };` : "export {};",
      ].join("\n");
      prepared.set(fileOf[i]!, {
        block,
        file: fileOf[i]!,
        text,
        pagePackages,
        program,
      });
    });
  }

  for (const [file, stub] of stubs) {
    const lines = [...stub.names].map(
      (n) =>
        `export declare const ${n}: any;\nexport type ${n}<A = any, B = any, C = any> = any;`,
    );
    if (stub.isDefault)
      lines.push("declare const _default: any;\nexport default _default;");
    lines.push("export {};");
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(`${file}.ts`, lines.join("\n"));
  }

  // packages the docs site doesn't install: link the workspace's copy
  const modules = path.join(dir, "node_modules");
  const paths: Record<string, string[]> = {};
  for (const [name, where] of located) {
    if (!where || where === "docs") continue;
    if ("src" in where) {
      const src = path.relative(dir, where.src);
      paths[name] = [`${src}/index`];
      paths[`${name}/*`] = [`${src}/*`];
      continue;
    }
    const link = path.join(modules, name);
    mkdirSync(path.dirname(link), { recursive: true });
    symlinkSync(where.link, link, "dir");
  }
  writeFileSync(path.join(dir, "reader-supplied.d.ts"), READER_SUPPLIED);
  // a file without imports, so these declare modules rather than augment
  // them; each name is a value and a (generic) type, both `any`
  writeFileSync(
    path.join(dir, "unresolvable.d.ts"),
    [...missingModules]
      .map(
        ([specifier, { names, isDefault }]) =>
          `declare module ${JSON.stringify(specifier)} {\n${[...names]
            .map(
              (n) =>
                `  export const ${n}: any;\n  export type ${n}<A = any, B = any, C = any> = any;`,
            )
            .join("\n")}${
            isDefault
              ? "\n  const _default: any;\n  export default _default;"
              : ""
          }\n}`,
      )
      .join("\n"),
  );
  // one copy of React's types, or a package installed elsewhere brings its own
  for (const name of ["react", "react-dom"]) {
    const types = path.relative(
      dir,
      path.join(DOCS, "node_modules/@types", name),
    );
    paths[name] = [types];
    paths[`${name}/*`] = [`${types}/*`];
  }
  const programs = [...new Set([...prepared.values()].map((p) => p.program))];
  for (const program of programs)
    writeFileSync(
      path.join(dir, `tsconfig.${program}.json`),
      JSON.stringify({
        compilerOptions: {
          target: "ES2022",
          lib: ["dom", "dom.iterable", "esnext"],
          module: "esnext",
          moduleResolution: "bundler",
          jsx: "react-jsx",
          strict: true,
          skipLibCheck: true,
          noEmit: true,
          resolveJsonModule: true,
          allowImportingTsExtensions: true,
          types: ["node"],
          typeRoots: [path.join(DOCS, "node_modules/@types")],
          paths,
          ...(program.startsWith("native")
            ? { customConditions: ["react-native"] }
            : {}),
        },
        files: [
          "reader-supplied.d.ts",
          "unresolvable.d.ts",
          ...[...prepared.values()]
            .filter((p) => p.program === program)
            .map((p) => path.relative(dir, p.file)),
        ],
      }),
    );

  const runTsc = (program: string) =>
    new Promise<string>((resolve) => {
      execFile(
        process.execPath,
        [
          path.join(DOCS, "node_modules/typescript/bin/tsc"),
          "-p",
          `tsconfig.${program}.json`,
          "--pretty",
          "false",
        ],
        { cwd: dir, encoding: "utf8", maxBuffer: 256 * 1024 * 1024 },
        (_error, stdout) => resolve(stdout),
      );
    });

  const tsc = async () => {
    for (const { file, text } of prepared.values()) {
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, text);
    }
    // tsc is multithreaded; a few at a time leave CPU for the other tests
    const outputs: string[] = [];
    const queue = [...programs];
    await Promise.all(
      Array.from({ length: 3 }, async () => {
        for (let next = queue.shift(); next; next = queue.shift())
          outputs.push(await runTsc(next));
      }),
    );
    const output = outputs.join("\n");
    const errors = new Map<string, { line: number; text: string }[]>();
    const checkerErrors: string[] = [];
    let current: { text: string }[] | undefined;
    for (const line of output.split("\n")) {
      const match = /^(.+?)\((\d+),(\d+)\): error (TS\d+): (.*)$/.exec(line);
      if (match) {
        const file = path.resolve(dir, match[1]!);
        if (!prepared.has(file)) {
          current = undefined;
          // errors in package sources aren't the docs' concern; errors in
          // the checker's own files are a bug in the checker
          if (file.startsWith(dir)) checkerErrors.push(line);
          continue;
        }
        // a signature shown on its own, as API references do
        if (match[4] === "TS2391") continue;
        if (
          Number(match[2]) > prepared.get(file)!.block.code.split("\n").length
        ) {
          checkerErrors.push(line);
          continue;
        }
        const list = errors.get(file) ?? [];
        list.push({
          line: Number(match[2]),
          text: `${match[3]} ${match[4]} ${match[5]}`,
        });
        errors.set(file, list);
        current = list;
      } else if (current && line.startsWith("  ")) {
        current[current.length - 1]!.text += `\n${line}`;
      }
    }
    return { errors, checkerErrors };
  };

  // Pass 1 finds names a block uses without importing them. A block may
  // leave out an import of a package's public export, as an editor adds it;
  // pass 2 adds those imports and reports what is still wrong.
  const exportsByPackage = packageExports();
  const first = await tsc();
  const implicit = new Map<string, string[]>();
  for (const [file, list] of first.errors) {
    const entry = prepared.get(file)!;
    const sectionPackage = SECTION_PACKAGES.find(([re]) =>
      re.test(entry.block.page),
    )?.[1];
    const order = [
      ...entry.pagePackages,
      ...(sectionPackage ? [sectionPackage] : []),
      "@assistant-ui/react",
      // the docs' default runtime
      "@assistant-ui/react-ai-sdk",
    ];
    const names = new Set(
      list.flatMap((e) => {
        const m = UNRESOLVED.exec(e.text);
        return m ? [m[2]!] : [];
      }),
    );
    const lines: string[] = [];
    for (const name of names) {
      const from = REACT_NAMES.has(name)
        ? "react"
        : name === "z"
          ? "zod"
          : order.find((pkg) => exportsByPackage.get(pkg)?.has(name));
      if (!from) continue;
      lines.push(`import { ${name} } from ${JSON.stringify(from)};`);
    }
    if (!lines.length) continue;
    entry.text = `${entry.text}\n${lines.join("\n")}`;
    implicit.set(
      file,
      lines.map((l) => /import \{ (\w+) \}/.exec(l)![1]!),
    );
  }
  const second = implicit.size ? await tsc() : first;

  const byBlock = new Map<
    TsBlock,
    { errors: string[]; implicitImports: string[] }
  >();
  for (const [block, errors] of syntaxErrors)
    byBlock.set(block, { errors, implicitImports: [] });
  for (const [file, entry] of prepared) {
    byBlock.set(entry.block, {
      errors: (second.errors.get(file) ?? []).map(
        (e) => `${entry.block.line + e.line - 1}:${e.text}`,
      ),
      implicitImports: implicit.get(file) ?? [],
    });
  }
  return {
    results: all.map((block) => ({
      ...block,
      ...(byBlock.get(block) ?? { errors: [], implicitImports: [] }),
    })),
    checkerErrors: second.checkerErrors,
    unresolvable: [...unresolvable].sort(),
    stubs: [...stubs.keys()].map((f) => path.relative(dir, f)).sort(),
    ms: Date.now() - started,
  };
}
