import {
  describe,
  it,
  expect,
  vi,
  beforeEach,
  afterEach,
  type Mock,
} from "vitest";
import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { EventEmitter } from "node:events";
import {
  resolveLatestReleaseRef,
  downloadProject,
  scaffoldProject,
  transformProject,
} from "../../src/lib/create-project";

// Mock cross-spawn so no real child processes are spawned
vi.mock("cross-spawn", () => ({
  spawn: vi.fn(() => {
    const ee = new EventEmitter();
    setTimeout(() => ee.emit("close", 0), 0);
    return ee;
  }),
}));

// Mock giget so no real downloads happen
vi.mock("giget", () => ({
  downloadTemplate: vi.fn().mockResolvedValue({}),
}));

// Also mock detect-package-manager to avoid filesystem probing
vi.mock("detect-package-manager", () => ({
  detect: vi.fn().mockResolvedValue("pnpm"),
}));

// Import the mocks after vi.mock so we can inspect calls
import { spawn } from "cross-spawn";
import { downloadTemplate } from "giget";
import {
  dlxCommand,
  type PackageManagerName,
} from "../../src/lib/create-project";

const TEST_PM: PackageManagerName = "pnpm";
const [TEST_DLX_CMD] = dlxCommand(TEST_PM);

const defaultOpts = {
  packageManager: TEST_PM,
  skipInstall: true,
} as const;

let testDir: string;
const GITHUB_AUTH_ENV_KEYS = [
  "GIGET_AUTH",
  "GITHUB_TOKEN",
  "GH_TOKEN",
] as const;
let originalGitHubAuthEnv: Record<
  (typeof GITHUB_AUTH_ENV_KEYS)[number],
  string | undefined
>;

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-create-project-"));
  originalGitHubAuthEnv = Object.fromEntries(
    GITHUB_AUTH_ENV_KEYS.map((key) => [key, process.env[key]]),
  ) as Record<(typeof GITHUB_AUTH_ENV_KEYS)[number], string | undefined>;
  for (const key of GITHUB_AUTH_ENV_KEYS) {
    delete process.env[key];
  }
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
  for (const key of GITHUB_AUTH_ENV_KEYS) {
    const value = originalGitHubAuthEnv[key];
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

function writeJSON(filePath: string, data: unknown) {
  const full = path.join(testDir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, JSON.stringify(data, null, 2));
}

function writeFile(filePath: string, content: string) {
  const full = path.join(testDir, filePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  fs.writeFileSync(full, content);
}

function readJSON(filePath: string) {
  return JSON.parse(fs.readFileSync(path.join(testDir, filePath), "utf-8"));
}

function readFile(filePath: string) {
  return fs.readFileSync(path.join(testDir, filePath), "utf-8");
}

describe("resolveLatestReleaseRef", () => {
  it("returns the tag name from the latest release", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValueOnce({
        ok: true,
        json: async () => ({ tag_name: "@assistant-ui/react@0.12.15" }),
      }),
    );
    expect(await resolveLatestReleaseRef()).toBe("@assistant-ui/react@0.12.15");
  });

  it("authenticates the latest release request when a GitHub token is configured", async () => {
    process.env.GITHUB_TOKEN = "ghs_test-token";
    const fetchMock = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ tag_name: "@assistant-ui/react@0.12.15" }),
    });
    vi.stubGlobal("fetch", fetchMock);

    expect(await resolveLatestReleaseRef()).toBe("@assistant-ui/react@0.12.15");
    expect(fetchMock).toHaveBeenCalledWith(
      "https://api.github.com/repos/assistant-ui/assistant-ui/releases/latest",
      { headers: { Authorization: "Bearer ghs_test-token" } },
    );
  });

  it("returns undefined when fetch fails", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );
    expect(await resolveLatestReleaseRef()).toBeUndefined();
  });
});

describe("downloadProject", () => {
  it("passes ref in giget source when provided", async () => {
    await downloadProject("templates/default", "/tmp/dest", "v1.0.0");

    expect(downloadTemplate).toHaveBeenCalledWith(
      "gh:assistant-ui/assistant-ui/templates/default#v1.0.0",
      expect.objectContaining({ dir: "/tmp/dest", force: true, silent: true }),
    );
  });

  it("omits ref from giget source when not provided", async () => {
    await downloadProject("examples/with-tanstack", "/tmp/dest");

    expect(downloadTemplate).toHaveBeenCalledWith(
      "gh:assistant-ui/assistant-ui/examples/with-tanstack",
      expect.objectContaining({ dir: "/tmp/dest", force: true, silent: true }),
    );
  });

  it("passes auth to giget when a GitHub token is configured", async () => {
    process.env.GH_TOKEN = "ghs_test-token";

    await downloadProject("templates/default", "/tmp/dest", "v1.0.0");

    expect(downloadTemplate).toHaveBeenCalledWith(
      "gh:assistant-ui/assistant-ui/templates/default#v1.0.0",
      expect.objectContaining({ auth: "ghs_test-token" }),
    );
  });
});

describe("scaffoldProject", () => {
  it("downloads from GitHub sources", async () => {
    await scaffoldProject("templates/default", "/tmp/dest", {
      kind: "github",
      ref: "v1.0.0",
    });

    expect(downloadTemplate).toHaveBeenCalledWith(
      "gh:assistant-ui/assistant-ui/templates/default#v1.0.0",
      expect.objectContaining({ dir: "/tmp/dest", force: true, silent: true }),
    );
  });

  it("copies from a local assistant-ui repo root", async () => {
    const repoRoot = path.join(testDir, "repo");
    const destDir = path.join(testDir, "dest");
    const templateDir = path.join(repoRoot, "templates", "default");
    fs.mkdirSync(path.join(templateDir, "app"), { recursive: true });
    fs.mkdirSync(path.join(templateDir, "node_modules", "pkg"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(templateDir, ".next", "server"), {
      recursive: true,
    });
    fs.mkdirSync(path.join(templateDir, "dist"), { recursive: true });
    fs.mkdirSync(path.join(templateDir, "build"), { recursive: true });
    fs.writeFileSync(path.join(templateDir, "package.json"), "{}");
    fs.writeFileSync(path.join(templateDir, "app", "page.tsx"), "export {};");
    fs.writeFileSync(
      path.join(templateDir, "node_modules", "pkg", "index.js"),
      "module.exports = {};",
    );
    fs.writeFileSync(path.join(templateDir, ".next", "server", "page.js"), "");
    fs.writeFileSync(path.join(templateDir, "dist", "index.js"), "");
    fs.writeFileSync(path.join(templateDir, "build", "index.js"), "");

    await scaffoldProject("templates/default", destDir, {
      kind: "local",
      rootDir: repoRoot,
    });

    expect(fs.existsSync(path.join(destDir, "package.json"))).toBe(true);
    expect(fs.existsSync(path.join(destDir, "app", "page.tsx"))).toBe(true);
    expect(fs.existsSync(path.join(destDir, "node_modules"))).toBe(false);
    expect(fs.existsSync(path.join(destDir, ".next"))).toBe(false);
    expect(fs.existsSync(path.join(destDir, "dist"))).toBe(false);
    expect(fs.existsSync(path.join(destDir, "build"))).toBe(false);
    expect(downloadTemplate).not.toHaveBeenCalled();
  });

  it("rejects missing local project sources", async () => {
    await expect(
      scaffoldProject("templates/missing", path.join(testDir, "dest"), {
        kind: "local",
        rootDir: testDir,
      }),
    ).rejects.toThrow("Local project source does not exist:");
  });
});

describe("transformProject — hasLocalComponents: true", () => {
  it("transforms package.json correctly", async () => {
    writeJSON("package.json", {
      name: "old-name",
      dependencies: {
        "@assistant-ui/react": "workspace:*",
        "@assistant-ui/ui": "workspace:*",
        next: "^15.0.0",
      },
      devDependencies: {
        "@assistant-ui/x-buildutils": "workspace:*",
        typescript: "^5.0.0",
      },
    });

    await transformProject(testDir, {
      ...defaultOpts,
      hasLocalComponents: true,
    });

    const pkg = readJSON("package.json");
    expect(pkg.dependencies["@assistant-ui/react"]).toBe("latest");
    expect(pkg.dependencies.next).toBe("^15.0.0");
    expect(pkg.dependencies["@assistant-ui/ui"]).toBeUndefined();
    expect(pkg.devDependencies["@assistant-ui/x-buildutils"]).toBeUndefined();
    expect(pkg.devDependencies.typescript).toBe("^5.0.0");
    expect(pkg.name).toBe(path.basename(testDir));
  });
});

describe("transformProject — hasLocalComponents: false", () => {
  beforeEach(() => {
    writeJSON("package.json", { name: "test", dependencies: {} });
  });

  async function run() {
    return transformProject(testDir, {
      ...defaultOpts,
      hasLocalComponents: false,
    });
  }

  // tsconfig tests
  describe("tsconfig transforms", () => {
    it("removes workspace paths", async () => {
      writeJSON("tsconfig.json", {
        compilerOptions: {
          paths: {
            "@/components/assistant-ui/*": ["./components/assistant-ui/*"],
            "@/components/icons/*": ["./components/icons/*"],
            "@/components/ui/*": ["./components/ui/*"],
            "@/hooks/*": ["./hooks/*"],
            "@/lib/utils": ["./lib/utils"],
            "@assistant-ui/ui/*": ["../../packages/ui/src/*"],
            "@/*": ["./*"],
          },
        },
      });

      await run();

      const tsconfig = readJSON("tsconfig.json");
      const paths = tsconfig.compilerOptions.paths;
      expect(paths["@/components/assistant-ui/*"]).toBeUndefined();
      expect(paths["@/components/icons/*"]).toBeUndefined();
      expect(paths["@/components/ui/*"]).toBeUndefined();
      expect(paths["@/hooks/*"]).toBeUndefined();
      expect(paths["@/lib/utils"]).toBeUndefined();
      expect(paths["@assistant-ui/ui/*"]).toBeUndefined();
      expect(paths["@/*"]).toEqual(["./*"]);
    });

    it("inlines x-buildutils/ts/next config with Next.js settings", async () => {
      writeJSON("tsconfig.json", {
        extends: "@assistant-ui/x-buildutils/ts/next",
        compilerOptions: {
          baseUrl: ".",
        },
      });

      await run();

      const tsconfig = readJSON("tsconfig.json");
      expect(tsconfig.extends).toBeUndefined();
      expect(tsconfig.compilerOptions.target).toBe("ESNext");
      expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
      expect(tsconfig.compilerOptions.plugins).toEqual([{ name: "next" }]);
      // User's baseUrl should be preserved
      expect(tsconfig.compilerOptions.baseUrl).toBe(".");
    });

    it("deletes empty paths object after removing workspace paths", async () => {
      writeJSON("tsconfig.json", {
        compilerOptions: {
          paths: {
            "@/components/assistant-ui/*": ["./components/assistant-ui/*"],
            "@/components/icons/*": ["./components/icons/*"],
            "@/components/ui/*": ["./components/ui/*"],
            "@/hooks/*": ["./hooks/*"],
            "@/lib/utils": ["./lib/utils"],
            "@assistant-ui/ui/*": ["../../packages/ui/src/*"],
          },
        },
      });

      await run();

      const tsconfig = readJSON("tsconfig.json");
      expect(tsconfig.compilerOptions.paths).toBeUndefined();
    });

    it("inlines x-buildutils/ts/base config without Next.js settings", async () => {
      writeJSON("tsconfig.json", {
        extends: "@assistant-ui/x-buildutils/ts/base",
        compilerOptions: {
          baseUrl: ".",
        },
      });

      await run();

      const tsconfig = readJSON("tsconfig.json");
      expect(tsconfig.extends).toBeUndefined();
      expect(tsconfig.compilerOptions.target).toBe("ESNext");
      expect(tsconfig.compilerOptions.jsx).toBe("react-jsx");
      expect(tsconfig.compilerOptions.plugins).toBeUndefined();
      expect(tsconfig.compilerOptions.baseUrl).toBe(".");
    });
  });

  // CSS transform tests
  describe("CSS transforms", () => {
    it("removes @source lines pointing at packages/ui/src", async () => {
      writeFile(
        "app/globals.css",
        '@source "../../packages/ui/src";\n@tailwind base;\nbody { margin: 0; }\n',
      );

      await run();

      const css = readFile("app/globals.css");
      expect(css).not.toContain("packages/ui/src");
      expect(css).toContain("@tailwind base");
      expect(css).toContain("body { margin: 0; }");
    });

    it("leaves other @source lines untouched", async () => {
      writeFile(
        "app/globals.css",
        '@source "./components";\n@source "../../packages/ui/src";\nbody {}\n',
      );

      await run();

      const css = readFile("app/globals.css");
      expect(css).toContain('@source "./components"');
      expect(css).not.toContain("packages/ui/src");
    });
  });

  // Component scanning tests
  describe("component scanning", () => {
    it("installs shadcn and assistant-ui components in a single shadcn add call", async () => {
      writeFile(
        "app/page.tsx",
        'import { Thread } from "@/components/assistant-ui/thread.tsx";\nimport { Button } from "@/components/ui/button.tsx";\nexport default function Page() { return <Thread />; }\n',
      );

      await run();

      const addCalls = (spawn as Mock).mock.calls.filter(
        ([cmd, args]: [string, string[]]) =>
          cmd === TEST_DLX_CMD &&
          args.includes("shadcn@latest") &&
          args.includes("add"),
      );
      expect(addCalls).toHaveLength(1);

      const args = addCalls[0]![1] as string[];
      expect(args).toContain("button");
      expect(args).toContain("@assistant-ui/thread");
      expect(args).not.toContain("button.tsx");
      expect(args).not.toContain("@assistant-ui/thread.tsx");
    });
  });
});

describe("transformProject — install behavior", () => {
  it("spawns the correct package manager install command", async () => {
    writeJSON("package.json", { name: "test", dependencies: {} });

    await transformProject(testDir, {
      ...defaultOpts,
      hasLocalComponents: true,
      skipInstall: false,
    });

    expect(spawn).toHaveBeenCalledWith(
      TEST_PM,
      ["install"],
      expect.objectContaining({ cwd: testDir }),
    );
  });
});

describe("installShadcnRegistry behavior", () => {
  it("resolves with a warning when shadcn exits non-zero", async () => {
    // Override spawn mock to emit non-zero exit
    (spawn as Mock).mockImplementationOnce(() => {
      const ee = new EventEmitter();
      setTimeout(() => ee.emit("close", 1), 0);
      return ee;
    });

    writeJSON("package.json", { name: "test", dependencies: {} });
    writeFile(
      "app/page.tsx",
      'import { Button } from "@/components/ui/button";\n',
    );

    // Should NOT throw — warn-and-continue behavior
    await transformProject(testDir, {
      ...defaultOpts,
      hasLocalComponents: false,
    });
  });
});
