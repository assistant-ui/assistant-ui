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

beforeEach(() => {
  testDir = fs.mkdtempSync(path.join(os.tmpdir(), "cli-create-project-"));
});

afterEach(() => {
  fs.rmSync(testDir, { recursive: true, force: true });
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
            "@/components/ui/*": ["./components/ui/*"],
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
      expect(paths["@/components/ui/*"]).toBeUndefined();
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
            "@/components/ui/*": ["./components/ui/*"],
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
    function findSpawnCall(
      predicate: (cmd: string, args: string[]) => boolean,
    ) {
      return (spawn as Mock).mock.calls.find(
        ([cmd, args]: [string, string[]]) => predicate(cmd, args),
      );
    }

    it("detects assistant-ui and shadcn component imports", async () => {
      writeFile(
        "app/page.tsx",
        'import { Thread } from "@/components/assistant-ui/thread";\nimport { Button } from "@/components/ui/button";\nexport default function Page() { return <Thread />; }\n',
      );

      await run();

      // assistant-ui components installed via shadcn registry
      const auiCall = findSpawnCall(
        (cmd, args) =>
          cmd === TEST_DLX_CMD &&
          args.includes("shadcn@latest") &&
          args.some((a) => a.includes("@assistant-ui/")),
      );
      expect(auiCall).toBeDefined();
      expect(auiCall![1]).toContain("@assistant-ui/thread");

      // shadcn UI components installed separately
      const shadcnCall = findSpawnCall(
        (cmd, args) =>
          cmd === TEST_DLX_CMD &&
          args.includes("shadcn@latest") &&
          args.includes("button"),
      );
      expect(shadcnCall).toBeDefined();
    });
  });

  // Workspace component removal
  describe("workspace component removal", () => {
    it("removes components/assistant-ui directory", async () => {
      writeFile(
        "components/assistant-ui/thread.tsx",
        "export default function Thread() {}",
      );

      await run();

      expect(
        fs.existsSync(path.join(testDir, "components", "assistant-ui")),
      ).toBe(false);
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
