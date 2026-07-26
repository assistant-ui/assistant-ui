import { describe, it, expect, beforeAll, afterAll } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  discoverInstalledPackages,
  findDuplicates,
  findOutdated,
  compareSemver,
  uniquePackageNames,
  type DiscoveredPackage,
} from "../../src/commands/doctor";

interface PackageSpec {
  name: string;
  version: string;
  installPath: string; // relative to fixture root
}

function writePackage(root: string, spec: PackageSpec): void {
  const dir = path.join(root, spec.installPath);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(
    path.join(dir, "package.json"),
    JSON.stringify({ name: spec.name, version: spec.version }),
  );
}

describe("compareSemver", () => {
  it("orders by major, minor, patch", () => {
    expect(compareSemver("1.0.0", "1.0.1")).toBeLessThan(0);
    expect(compareSemver("1.1.0", "1.0.9")).toBeGreaterThan(0);
    expect(compareSemver("2.0.0", "1.99.99")).toBeGreaterThan(0);
    expect(compareSemver("1.2.3", "1.2.3")).toBe(0);
  });

  it("treats a prerelease as less than the matching stable", () => {
    expect(compareSemver("1.0.0-alpha", "1.0.0")).toBeLessThan(0);
    expect(compareSemver("1.0.0", "1.0.0-alpha")).toBeGreaterThan(0);
    expect(compareSemver("1.0.0-alpha.1", "1.0.0-alpha.2")).toBeLessThan(0);
    expect(compareSemver("1.0.0-beta.2", "1.0.0-beta.10")).toBeLessThan(0);
    expect(compareSemver("0.3.0-rc.1", "0.3.0")).toBeLessThan(0);
  });

  it("falls back to lexical comparison for unparseable strings", () => {
    expect(compareSemver("a", "b")).toBeLessThan(0);
  });
});

describe("doctor — package discovery", () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-doctor-"));
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        dependencies: {
          "@assistant-ui/react": "0.14.5",
          "@assistant-ui/react-ai-sdk": "1.3.26",
        },
      }),
    );

    // Top-level installs
    writePackage(root, {
      name: "@assistant-ui/react",
      version: "0.14.5",
      installPath: "node_modules/@assistant-ui/react",
    });
    writePackage(root, {
      name: "@assistant-ui/core",
      version: "0.2.5",
      installPath: "node_modules/@assistant-ui/core",
    });
    writePackage(root, {
      name: "@assistant-ui/react-ai-sdk",
      version: "1.3.26",
      installPath: "node_modules/@assistant-ui/react-ai-sdk",
    });
    writePackage(root, {
      name: "assistant-stream",
      version: "0.3.14",
      installPath: "node_modules/assistant-stream",
    });

    // Transitive copy of @assistant-ui/core nested inside react-ai-sdk
    writePackage(root, {
      name: "@assistant-ui/core",
      version: "0.2.2",
      installPath:
        "node_modules/@assistant-ui/react-ai-sdk/node_modules/@assistant-ui/core",
    });

    // Unrelated package that should be ignored
    writePackage(root, {
      name: "lodash",
      version: "4.17.21",
      installPath: "node_modules/lodash",
    });

    // A tracked package nested inside an *untracked* package — current
    // behavior is to skip recursion into untracked subtrees so doctor
    // stays fast on large repos.
    writePackage(root, {
      name: "@assistant-ui/core",
      version: "0.0.0-buried",
      installPath: "node_modules/lodash/node_modules/@assistant-ui/core",
    });

    // Dot-prefixed directories must be skipped
    fs.mkdirSync(path.join(root, "node_modules", ".pnpm"), { recursive: true });
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("collects every assistant-ui package, including nested transitives", () => {
    const found = discoverInstalledPackages(root);
    const summary = found
      .map((p) => `${p.name}@${p.version}`)
      .sort()
      .join(",");

    expect(summary).toContain("@assistant-ui/core@0.2.2");
    expect(summary).toContain("@assistant-ui/core@0.2.5");
    expect(summary).toContain("@assistant-ui/react@0.14.5");
    expect(summary).toContain("@assistant-ui/react-ai-sdk@1.3.26");
    expect(summary).toContain("assistant-stream@0.3.14");
    expect(summary).not.toContain("lodash");
  });

  it("does not recurse into untracked packages' node_modules", () => {
    const found = discoverInstalledPackages(root);
    expect(found.find((p) => p.version === "0.0.0-buried")).toBeUndefined();
  });

  it("flags @assistant-ui/core as duplicated across versions", () => {
    const dups = findDuplicates(discoverInstalledPackages(root));
    expect(dups).toHaveLength(1);
    expect(dups[0]!.name).toBe("@assistant-ui/core");
    const versions = dups[0]!.installations.map((i) => i.version).sort();
    expect(versions).toEqual(["0.2.2", "0.2.5"]);
  });
});

describe("doctor — workspace package discovery", () => {
  it("finds packages hoisted above the selected workspace package", () => {
    const fixture = fs.mkdtempSync(
      path.join(os.tmpdir(), "aui-doctor-workspace-"),
    );
    const root = path.join(fixture, "workspace");
    const app = path.join(root, "packages", "app");
    const linkedApp = path.join(fixture, "linked-app");

    try {
      fs.mkdirSync(app, { recursive: true });
      fs.symlinkSync(
        app,
        linkedApp,
        process.platform === "win32" ? "junction" : "dir",
      );
      fs.writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({
          name: "workspace",
          private: true,
          workspaces: ["packages/*"],
        }),
      );
      fs.writeFileSync(
        path.join(app, "package.json"),
        JSON.stringify({
          name: "app",
          dependencies: { "@assistant-ui/react": "0.14.5" },
        }),
      );
      writePackage(root, {
        name: "@assistant-ui/react",
        version: "0.14.5",
        installPath: "node_modules/@assistant-ui/react",
      });
      writePackage(fixture, {
        name: "@assistant-ui/core",
        version: "0.2.0",
        installPath: "node_modules/@assistant-ui/core",
      });

      const realRoot = fs.realpathSync(root);
      const expected = [
        {
          name: "@assistant-ui/react",
          version: "0.14.5",
          installPath: path.join(
            realRoot,
            "node_modules",
            "@assistant-ui",
            "react",
          ),
        },
      ];

      expect(discoverInstalledPackages(app)).toEqual(expected);
      expect(discoverInstalledPackages(linkedApp)).toEqual(expected);
    } finally {
      fs.rmSync(fixture, { recursive: true, force: true });
    }
  });
});

describe("doctor — pnpm store discovery", () => {
  let root: string;

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-doctor-pnpm-"));
    fs.writeFileSync(
      path.join(root, "package.json"),
      JSON.stringify({
        name: "fixture",
        version: "1.0.0",
        dependencies: { "@assistant-ui/react": "0.14.5" },
      }),
    );

    // Direct dependency hoisted into the top-level node_modules.
    writePackage(root, {
      name: "@assistant-ui/react",
      version: "0.14.5",
      installPath: "node_modules/@assistant-ui/react",
    });

    // Two peer-closure-split copies of @assistant-ui/core, each in its own
    // .pnpm virtual-store entry — the exact duplication class from #4101.
    writePackage(root, {
      name: "@assistant-ui/core",
      version: "0.2.5",
      installPath:
        "node_modules/.pnpm/@assistant-ui+core@0.2.5_react@18.3.1/node_modules/@assistant-ui/core",
    });
    writePackage(root, {
      name: "@assistant-ui/core",
      version: "0.2.2",
      installPath:
        "node_modules/.pnpm/@assistant-ui+core@0.2.2_react@19.0.0/node_modules/@assistant-ui/core",
    });

    // Unscoped tracked package living in the store.
    writePackage(root, {
      name: "assistant-stream",
      version: "0.3.14",
      installPath:
        "node_modules/.pnpm/assistant-stream@0.3.14/node_modules/assistant-stream",
    });

    // Unrelated package in the store must be ignored.
    writePackage(root, {
      name: "lodash",
      version: "4.17.21",
      installPath: "node_modules/.pnpm/lodash@4.17.21/node_modules/lodash",
    });
  });

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });

  it("collects assistant-ui copies from the .pnpm virtual store", () => {
    const found = discoverInstalledPackages(root);
    const summary = found
      .map((p) => `${p.name}@${p.version}`)
      .sort()
      .join(",");

    expect(summary).toContain("@assistant-ui/core@0.2.2");
    expect(summary).toContain("@assistant-ui/core@0.2.5");
    expect(summary).toContain("@assistant-ui/react@0.14.5");
    expect(summary).toContain("assistant-stream@0.3.14");
    expect(summary).not.toContain("lodash");
  });

  it("flags the peer-split @assistant-ui/core copies as duplicated", () => {
    const dups = findDuplicates(discoverInstalledPackages(root));
    expect(dups).toHaveLength(1);
    expect(dups[0]!.name).toBe("@assistant-ui/core");
    const versions = dups[0]!.installations.map((i) => i.version).sort();
    expect(versions).toEqual(["0.2.2", "0.2.5"]);
  });
});

describe("doctor — no pnpm store", () => {
  it("returns nothing extra and does not throw when .pnpm is absent", () => {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), "aui-doctor-npm-"));
    try {
      fs.writeFileSync(
        path.join(root, "package.json"),
        JSON.stringify({ name: "fixture", version: "1.0.0" }),
      );
      writePackage(root, {
        name: "@assistant-ui/react",
        version: "0.14.5",
        installPath: "node_modules/@assistant-ui/react",
      });
      const found = discoverInstalledPackages(root);
      expect(found.map((p) => `${p.name}@${p.version}`)).toEqual([
        "@assistant-ui/react@0.14.5",
      ]);
    } finally {
      fs.rmSync(root, { recursive: true, force: true });
    }
  });
});

describe("findOutdated", () => {
  it("flags packages whose installed version is older than the latest", () => {
    const installed: DiscoveredPackage[] = [
      { name: "@assistant-ui/react", version: "0.14.5", installPath: "" },
      { name: "@assistant-ui/core", version: "0.2.5", installPath: "" },
      { name: "assistant-stream", version: "0.3.14", installPath: "" },
    ];
    const latest = new Map<string, string | null>([
      ["@assistant-ui/react", "0.15.0"],
      ["@assistant-ui/core", "0.2.5"],
      ["assistant-stream", "0.3.16"],
    ]);

    const outdated = findOutdated(installed, latest);
    const summary = outdated
      .map((o) => `${o.name}:${o.current}->${o.latest}`)
      .join(",");

    expect(summary).toContain("@assistant-ui/react:0.14.5->0.15.0");
    expect(summary).toContain("assistant-stream:0.3.14->0.3.16");
    expect(summary).not.toContain("@assistant-ui/core");
  });

  it("uses the newest installed version when multiple are found", () => {
    const installed: DiscoveredPackage[] = [
      { name: "@assistant-ui/core", version: "0.2.2", installPath: "a" },
      { name: "@assistant-ui/core", version: "0.2.5", installPath: "b" },
    ];
    const latest = new Map<string, string | null>([
      ["@assistant-ui/core", "0.2.5"],
    ]);
    expect(findOutdated(installed, latest)).toEqual([]);
  });

  it("flags an older numeric prerelease", () => {
    const installed: DiscoveredPackage[] = [
      {
        name: "@assistant-ui/react",
        version: "1.0.0-beta.2",
        installPath: "",
      },
    ];
    const latest = new Map<string, string | null>([
      ["@assistant-ui/react", "1.0.0-beta.10"],
    ]);

    expect(findOutdated(installed, latest)).toEqual([
      {
        name: "@assistant-ui/react",
        current: "1.0.0-beta.2",
        latest: "1.0.0-beta.10",
      },
    ]);
  });

  it("skips packages with no latest version (e.g. network failed)", () => {
    const installed: DiscoveredPackage[] = [
      { name: "@assistant-ui/react", version: "0.14.5", installPath: "" },
    ];
    const latest = new Map<string, string | null>([
      ["@assistant-ui/react", null],
    ]);
    expect(findOutdated(installed, latest)).toEqual([]);
  });
});

describe("uniquePackageNames", () => {
  it("returns sorted unique names", () => {
    const installed: DiscoveredPackage[] = [
      { name: "@assistant-ui/react", version: "0.14.5", installPath: "" },
      { name: "@assistant-ui/core", version: "0.2.2", installPath: "" },
      { name: "@assistant-ui/core", version: "0.2.5", installPath: "" },
    ];
    expect(uniquePackageNames(installed)).toEqual([
      "@assistant-ui/core",
      "@assistant-ui/react",
    ]);
  });
});
