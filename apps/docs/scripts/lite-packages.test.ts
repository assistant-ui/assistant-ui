import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, expect, it } from "vitest";
import { liteAliases } from "./lite-packages.mts";

let repo: string;
afterEach(() => rmSync(repo, { recursive: true, force: true }));

function pkg(dir: string, manifest: object, built = true) {
  mkdirSync(join(repo, "packages", dir), { recursive: true });
  writeFileSync(
    join(repo, "packages", dir, "package.json"),
    JSON.stringify(manifest),
  );
  if (built) mkdirSync(join(repo, "packages", dir, "dist"));
}

function setup(dependencies: Record<string, string>) {
  repo = mkdtempSync(join(tmpdir(), "lite-packages-"));
  mkdirSync(join(repo, "apps/docs"), { recursive: true });
  writeFileSync(
    join(repo, "apps/docs/package.json"),
    JSON.stringify({ dependencies }),
  );
  return join(repo, "apps/docs");
}

it("aliases built package exports and leaves source and server builds alone", () => {
  const root = setup({ "@x/react": "workspace:*" });
  pkg("react", {
    name: "@x/react",
    exports: {
      ".": { types: "./dist/index.d.ts", default: "./dist/index.js" },
      "./internal": { default: "./dist/internal.js" },
    },
  });
  pkg("ui", { name: "@x/ui", exports: { "./*": "./src/*" } }, false);
  pkg("gen", {
    name: "@x/gen",
    exports: {
      ".": { "react-server": "./dist/server.js", default: "./dist/index.js" },
    },
  });
  expect(liteAliases(root)).toEqual({
    "@x/react": "../../packages/react/dist/index.js",
    "@x/react/internal": "../../packages/react/dist/internal.js",
  });
});

it("fails clearly when a docs dependency has no build", () => {
  const root = setup({ "@x/react": "workspace:*" });
  pkg("react", { name: "@x/react", exports: "./dist/index.js" }, false);
  pkg("other", { name: "@x/other", exports: "./dist/index.js" }, false);
  expect(() => liteAliases(root)).toThrow(/@x\/react has no dist yet/);
});
