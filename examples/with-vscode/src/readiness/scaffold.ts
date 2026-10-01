import { execFile } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { promisify } from "node:util";
import type { ProbeResult } from "./probes";
import type { HostProbe } from "./runner";

type SharedFile = {
  /** Path in the scaffolded project. */
  scaffold: string;
  /** Path in the test bed, or in the repository when it starts with `/`. */
  testbed?: string;
};

type Check = {
  name: string;
  files: SharedFile[];
  /** Returns the reasons the scaffold and the test bed disagree. */
  compare(scaffold: string[], testbed: string[]): string[];
};

type PackageJson = {
  main?: string;
  engines?: Record<string, string>;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
};

const run = promisify(execFile);

/** The lines of the top-level `const <name>` statement, without its paths. */
const statement = (source: string, name: string) => {
  const lines = source.split("\n");
  const start = lines.findIndex((line) =>
    new RegExp(`^const ${name}\\b`).test(line),
  );
  if (start === -1) return undefined;
  const end = lines.findIndex((line, i) => i > start && /^[})]/.test(line));
  return lines
    .slice(start, end + 1)
    .filter((line) => !/^\s*(entryPoints|outfile):/.test(line))
    .map((line) => line.trim())
    .join("\n");
};

const cssImports = (css: string) =>
  [...css.matchAll(/^@import\s+"([^"]+)";/gm)].map((m) => m[1]);

const importSources = (source: string) =>
  [...source.matchAll(/^import\s+(?:[^"']*\sfrom\s+)?["']([^"']+)["']/gm)].map(
    (m) => m[1] ?? "",
  );

const missing = (label: string, source: string, needles: string[]) =>
  needles
    .filter((needle) => !source.includes(needle))
    .map((needle) => `${label} lacks ${needle}`);

const sameJson = (a: unknown, b: unknown) =>
  JSON.stringify(a) === JSON.stringify(b);

/**
 * The files `templates/vscode` and the test bed share by design. Each check
 * compares the part that must not drift and ignores what legitimately
 * differs (fixtures, switchboard, probe wiring, file layout).
 */
const CHECKS: Check[] = [
  {
    name: "chat route",
    files: [
      {
        scaffold: "src/api/chat/route.ts",
        testbed: "/templates/default/app/api/chat/route.ts",
      },
    ],
    compare([scaffold = ""], [nextRoute = ""]) {
      const body = (source: string) =>
        source.slice(source.indexOf("export async function POST"));
      return body(scaffold) === body(nextRoute)
        ? []
        : ["POST differs from the default template's app/api/chat/route.ts"];
    },
  },
  {
    name: "esbuild options",
    files: [{ scaffold: "scripts/build.mts", testbed: "scripts/build.mts" }],
    compare([scaffold = ""], [testbed = ""]) {
      return ["watchLog", "buildCss", "nodeOptions", "webviewOptions"].flatMap(
        (name) => {
          const a = statement(scaffold, name);
          if (a === undefined) return [`scaffold has no ${name}`];
          return a === statement(testbed, name) ? [] : [`${name} differs`];
        },
      );
    },
  },
  {
    name: "webview HTML and CSP",
    files: [{ scaffold: "src/extension.ts", testbed: "src/webviews.ts" }],
    compare([scaffold = ""], [testbed = ""]) {
      const needles = [
        "serveWebviewHost(",
        "openExternal",
        "storage:",
        "renderWebviewHtml(",
        'scriptType: "classic"',
        "enableScripts: true",
        "localResourceRoots:",
        '"main.js"',
        '"app.css"',
        '"main.css"',
      ];
      return [
        ...missing("scaffold", scaffold, needles),
        ...missing("test bed", testbed, needles),
      ];
    },
  },
  {
    name: "theme import",
    files: [{ scaffold: "src/webview/app.css", testbed: "webview/app.css" }],
    compare([scaffold = ""], [testbed = ""]) {
      return [
        ["scaffold", scaffold],
        ["test bed", testbed],
      ].flatMap(([label, css = ""]) => {
        const imports = cssImports(css);
        if (imports[0] !== "tailwindcss")
          return [`${label} does not import tailwindcss first`];
        if (!imports.includes("@assistant-ui/vscode/theme.css"))
          return [`${label} does not import the theme`];
        return /@custom-variant dark\b|^\s*--background:/m.test(css)
          ? [`${label} overrides the theme's dark variant or tokens`]
          : [];
      });
    },
  },
  {
    name: "zod jitless",
    files: [
      {
        scaffold: "src/webview/zod-jitless.ts",
        testbed: "webview/zod-jitless.ts",
      },
      { scaffold: "src/webview/main.tsx", testbed: "webview/main.tsx" },
    ],
    compare([scaffold = "", scaffoldMain = ""], [testbed = "", testbedMain]) {
      const importedFirst = (label: string, source: string) => {
        const sources = importSources(source);
        const jitless = sources.indexOf("./zod-jitless");
        const firstPackage = sources.findIndex((s) => !s.startsWith("."));
        return jitless !== -1 && jitless < firstPackage
          ? []
          : [`${label} does not import ./zod-jitless before any package`];
      };
      return [
        ...(scaffold === testbed ? [] : ["zod-jitless.ts differs"]),
        ...importedFirst("scaffold", scaffoldMain),
        ...importedFirst("test bed", testbedMain ?? ""),
      ];
    },
  },
  {
    name: "ai-sdk runtime",
    files: [
      {
        scaffold: "src/webview/assistant.tsx",
        testbed: "webview/main.tsx",
      },
      { scaffold: "src/webview/main.tsx", testbed: "webview/main.tsx" },
    ],
    compare([scaffold = "", scaffoldMain = ""], [testbed = "", testbedMain]) {
      const needles = [
        "new AssistantChatTransport({",
        "fetch: vscodeFetch",
        "sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls",
      ];
      return [
        ...missing("scaffold", scaffold, needles),
        ...missing("test bed", testbed, needles),
        ...missing("scaffold main", scaffoldMain, ["installLinkInterceptor()"]),
        ...missing("test bed main", testbedMain ?? "", [
          "installLinkInterceptor()",
        ]),
      ];
    },
  },
  {
    name: "package.json",
    files: [{ scaffold: "package.json", testbed: "package.json" }],
    compare([scaffold = "{}"], [testbed = "{}"]) {
      const a = JSON.parse(scaffold) as PackageJson;
      const b = JSON.parse(testbed) as PackageJson;
      const ranges = (pkg: PackageJson) => ({
        ...pkg.dependencies,
        ...pkg.devDependencies,
      });
      const testbedRanges = ranges(b);
      const drift = Object.entries(ranges(a)).flatMap(([name, range]) => {
        const other = testbedRanges[name];
        if (other === undefined || other.startsWith("workspace:")) return [];
        return other === range ? [] : [`${name} ${range} vs ${other}`];
      });
      return [
        ...(a.engines?.vscode === b.engines?.vscode
          ? []
          : ["engines.vscode differs"]),
        ...(a.main === b.main ? [] : ["main differs"]),
        ...drift,
      ];
    },
  },
  {
    name: "F5 tasks",
    files: [
      { scaffold: ".vscode/tasks.json", testbed: ".vscode/tasks.json" },
      { scaffold: ".vscode/launch.json", testbed: ".vscode/launch.json" },
    ],
    compare([scaffoldTasks, scaffoldLaunch], [testbedTasks, testbedLaunch]) {
      type Task = { label: string; problemMatcher?: unknown };
      type Launch = {
        configurations: {
          type: string;
          args: string[];
          preLaunchTask: string;
        }[];
      };
      const dev = (tasks = "{}") =>
        (JSON.parse(tasks) as { tasks: Task[] }).tasks.find(
          (t) => t.label === "dev",
        )?.problemMatcher;
      const launch = (config = "{}") => {
        const { type, args, preLaunchTask } = (JSON.parse(config) as Launch)
          .configurations[0]!;
        return { type, args, preLaunchTask };
      };
      return [
        ...(sameJson(dev(scaffoldTasks), dev(testbedTasks))
          ? []
          : ["the dev task's problem matcher differs"]),
        ...(sameJson(launch(scaffoldLaunch), launch(testbedLaunch))
          ? []
          : ["the launch configuration differs"]),
      ];
    },
  },
  {
    name: "scaffold transforms",
    files: [
      { scaffold: "package.json" },
      { scaffold: "tsconfig.json" },
      { scaffold: "src/webview/app.css" },
    ],
    compare([pkg = "", tsconfig = "", css = ""]) {
      return [
        ...(pkg.includes("workspace:")
          ? ["package.json keeps workspace:"]
          : []),
        ...(tsconfig.includes("packages/ui")
          ? ["tsconfig.json keeps packages/ui paths"]
          : []),
        ...(css.includes("packages/ui") ? ["app.css keeps @source"] : []),
      ];
    },
  },
];

/**
 * Scaffolds `create --template vscode` from this checkout and checks that the
 * files it shares with the test bed have not drifted.
 */
export const scaffoldMatches: HostProbe = async (ctx) => {
  const testbedDir = ctx.extensionPath;
  const repoDir = path.resolve(testbedDir, "..", "..");
  const cli = path.join(
    testbedDir,
    "node_modules",
    "assistant-ui",
    "bin",
    "assistant-ui.js",
  );
  const tempDir = await mkdtemp(path.join(tmpdir(), "aui-scaffold-"));
  const scaffoldDir = path.join(tempDir, "vscode-extension");
  try {
    // Commander misreads argv under Electron's Node, so the CLI runs on Node from PATH.
    await run(
      "node",
      [
        cli,
        "create",
        scaffoldDir,
        "--template",
        "vscode",
        "--debug-source-root",
        repoDir,
        "--skip-install",
        "--no-skills",
        "--use-npm",
      ],
      { timeout: 60_000 },
    );

    const read = (file: string | undefined, base: string) => {
      if (file === undefined) return "";
      return readFile(
        file.startsWith("/") ? path.join(repoDir, file) : path.join(base, file),
        "utf-8",
      );
    };
    const failures: string[] = [];
    for (const check of CHECKS) {
      const [scaffold, testbed] = await Promise.all([
        Promise.all(check.files.map((f) => read(f.scaffold, scaffoldDir))),
        Promise.all(check.files.map((f) => read(f.testbed, testbedDir))),
      ]);
      failures.push(
        ...check
          .compare(scaffold, testbed)
          .map((reason) => `${check.name}: ${reason}`),
      );
    }

    if (failures.length > 0) {
      return { state: "fail", detail: failures.join("; ") };
    }
    return {
      state: "pass",
      detail: `${CHECKS.length} checks match: ${CHECKS.map((c) => c.name).join(", ")}`,
    } satisfies ProbeResult;
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
};
