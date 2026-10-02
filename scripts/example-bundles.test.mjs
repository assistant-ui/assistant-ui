import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import {
  cp,
  mkdir,
  mkdtemp,
  readFile,
  readdir,
  rm,
  symlink,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, extname, join, relative, resolve, sep } from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const examples = JSON.parse(
  await readFile(join(root, "scripts/example-bundles.json"), "utf8"),
);

async function runtimeImports(path, contents) {
  const { build } = createRequire(
    join(root, "examples/bundle-shared/package.json"),
  )("esbuild");
  const { metafile } = await build({
    stdin: {
      contents,
      sourcefile: path,
      loader: path.endsWith(".tsx")
        ? "tsx"
        : path.endsWith(".ts")
          ? "ts"
          : "js",
    },
    bundle: false,
    write: false,
    metafile: true,
    logLevel: "silent",
  });
  return Object.values(metafile.outputs).flatMap((output) =>
    output.imports.map((item) => item.path),
  );
}

async function filesUnder(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await filesUnder(path)));
    else files.push(path);
  }
  return files;
}

const contentRoutes = new Set(
  (await filesUnder(join(root, "apps/docs/content")))
    .filter((path) => path.endsWith(".mdx"))
    .map(
      (path) =>
        "/" +
        relative(join(root, "apps/docs/content"), path)
          .split(sep)
          .filter((segment) => !/^\(.+\)$/.test(segment))
          .join("/")
          .replace(/\.mdx$/, "")
          .replace(/\/index$/, ""),
    ),
);

test("bundle manifest points to existing packages, entries, and guide pages", async () => {
  assert.equal(
    new Set(examples.map((example) => example.slug)).size,
    examples.length,
  );
  assert.equal(
    new Set(examples.map((example) => example.package)).size,
    examples.length,
  );
  for (const example of examples) {
    const directory = join(root, "examples", example.package);
    const pkg = JSON.parse(
      await readFile(join(directory, "package.json"), "utf8"),
    );
    assert.equal(pkg.name, example.package);
    assert.ok(
      existsSync(join(directory, example.entry)),
      `${example.slug}: missing entry`,
    );
    for (const href of [
      example.guide,
      ...example.components.map((component) => component.href),
    ]) {
      if (!href.startsWith("/")) continue;
      assert.ok(
        contentRoutes.has(href),
        `${example.slug}: missing documentation route ${href}`,
      );
    }
  }
});

test("source packaging relocates nested shared imports and vendors the reusable cursor", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "example-package-contract-"));
  try {
    const example = examples.find(
      (entry) => entry.package === "bundle-website-agent",
    );
    assert.ok(example);
    await mkdir(join(fixture, "scripts"), { recursive: true });
    await cp(
      join(root, "scripts/package-example-bundles.mjs"),
      join(fixture, "scripts/package-example-bundles.mjs"),
    );
    await writeFile(
      join(fixture, "scripts/example-bundles.json"),
      JSON.stringify([example]),
    );
    const source = join(fixture, "examples", example.package);
    await mkdir(join(source, "dist"), { recursive: true });
    for (const file of ["src", "README.md", "package.json"]) {
      await cp(
        join(root, "examples", example.package, file),
        join(source, file),
        { recursive: true },
      );
    }
    await mkdir(join(source, "src/nested"), { recursive: true });
    await writeFile(
      join(source, "src/nested/reference.tsx"),
      'export { PreviewChat } from "../../../bundle-shared/chat"; // from "./missing-comment-path"',
    );
    const uiRoot = join(root, "packages/ui/src");
    const uiFiles = [
      "components/react/ui/base/button.tsx",
      "components/react/ui/base/input.tsx",
      "components/react/assistant-ui/elements/thread.aui.tsx",
      "components/react/assistant-ui/elements/assistant-modal.aui.tsx",
    ];
    await writeFile(
      join(source, "dist/build-info.json"),
      JSON.stringify({
        slug: example.slug,
        inputs: uiFiles.map((path) =>
          relative(join(root, "examples", example.package), join(uiRoot, path)),
        ),
      }),
    );
    for (const file of uiFiles) {
      const target = join(fixture, "packages/ui/src", file);
      await mkdir(dirname(target), { recursive: true });
      await cp(join(uiRoot, file), target);
    }
    await cp(
      join(root, "examples/bundle-shared"),
      join(fixture, "examples/bundle-shared"),
      {
        recursive: true,
        filter: (path) => !path.split(sep).includes("node_modules"),
      },
    );
    for (const packageName of ["react", "ai-sdk", "ui", "react-markdown"]) {
      await mkdir(join(fixture, "packages", packageName), { recursive: true });
      await cp(
        join(root, "packages", packageName, "package.json"),
        join(fixture, "packages", packageName, "package.json"),
      );
    }
    execFileSync(
      process.execPath,
      [join(fixture, "scripts/package-example-bundles.mjs")],
      { cwd: fixture, timeout: 10_000, stdio: "pipe" },
    );
    const unpacked = join(fixture, "unpacked");
    await mkdir(unpacked);
    execFileSync("tar", [
      "-xzf",
      join(
        fixture,
        "apps/docs/public/example-bundles",
        example.slug,
        "source.tar.gz",
      ),
      "-C",
      unpacked,
    ]);
    assert.ok(existsSync(join(unpacked, "src/agent-cursor.tsx")));
    for (const file of ["src/main.tsx", "src/nested/reference.tsx"]) {
      const path = join(unpacked, file);
      const text = await readFile(path, "utf8");
      for (const specifier of await runtimeImports(path, text)) {
        if (!specifier.startsWith(".")) continue;
        const candidate = resolve(dirname(path), specifier);
        assert.ok(
          candidate.startsWith(unpacked + sep),
          `${file}: import escapes archive ${specifier}`,
        );
        assert.ok(
          [candidate, candidate + ".tsx", candidate + ".ts"].some(existsSync),
          `${file}: unresolved archive import ${specifier}`,
        );
      }
    }
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

for (const example of examples) {
  const artifact = join(root, "examples", example.package, "dist");
  test(
    `${example.slug}: browser artifact excludes documentation application code`,
    {
      skip:
        !existsSync(join(artifact, "build-info.json")) &&
        "Build bundles before testing artifacts",
    },
    async () => {
      const info = JSON.parse(
        await readFile(join(artifact, "build-info.json"), "utf8"),
      );
      assert.equal(info.package, example.package);
      assert.equal(info.slug, example.slug);
      assert.ok(info.inputs.length > 0);
      assert.ok(info.bytes > 0);
      assert.ok(
        info.inputs.some((path) =>
          path.endsWith("assistant-ui/elements/thread.aui.tsx"),
        ),
        `${example.slug}: preview must use the shipped shadcn Thread template`,
      );
      const html = await readFile(join(artifact, "index.html"), "utf8");
      for (const input of info.inputs) {
        const path = resolve(root, "examples", example.package, input);
        assert.ok(
          !path.startsWith(join(root, "apps/docs") + sep),
          `${example.slug}: docs input ${input}`,
        );
      }
      for (const [, href] of html.matchAll(/(?:src|href)="([^"]+)"/g)) {
        assert.ok(
          existsSync(resolve(artifact, href)),
          `${example.slug}: missing output ${href}`,
        );
      }
    },
  );

  const archive = join(
    root,
    "apps/docs/public/example-bundles",
    example.slug,
    "source.tar.gz",
  );
  test(
    `${example.slug}: downloaded source has no workspace-only imports or dependencies`,
    {
      skip:
        !existsSync(archive) &&
        "Package bundles before testing downloaded source",
    },
    async () => {
      const scratch = await mkdtemp(
        join(tmpdir(), "example-download-contract-"),
      );
      try {
        const entries = execFileSync("tar", ["-tzf", archive], {
          encoding: "utf8",
        })
          .trim()
          .split("\n");
        for (const entry of entries) {
          assert.ok(
            !entry.startsWith("/") && !entry.split("/").includes(".."),
            `Unsafe archive entry ${entry}`,
          );
        }
        execFileSync("tar", ["-xzf", archive, "-C", scratch]);
        const pkg = JSON.parse(
          await readFile(join(scratch, "package.json"), "utf8"),
        );
        const dependencies = { ...pkg.dependencies, ...pkg.devDependencies };
        for (const [name, version] of Object.entries(dependencies)) {
          assert.ok(
            !version.startsWith("workspace:"),
            `${example.slug}: unresolved dependency ${name}`,
          );
        }
        assert.ok(existsSync(join(scratch, "build.mjs")));
        assert.ok(existsSync(join(scratch, "README.md")));
        assert.ok(
          existsSync(
            join(
              scratch,
              "ui/components/react/assistant-ui/elements/thread.aui.tsx",
            ),
          ),
        );
        const displayedSource = JSON.parse(
          await readFile(
            join(
              root,
              "apps/docs/public/example-bundles",
              example.slug,
              "source.json",
            ),
            "utf8",
          ),
        );
        for (const file of displayedSource) {
          assert.equal(
            file.content,
            await readFile(join(scratch, file.path), "utf8"),
          );
        }
        for (const path of await filesUnder(scratch)) {
          if (![".ts", ".tsx", ".js", ".mjs"].includes(extname(path))) continue;
          const text = await readFile(path, "utf8");
          for (const specifier of await runtimeImports(path, text)) {
            if (specifier.startsWith("node:")) continue;
            if (!specifier.startsWith(".")) {
              const name = specifier.startsWith("@")
                ? specifier.split("/").slice(0, 2).join("/")
                : specifier.split("/")[0];
              assert.ok(
                name in dependencies,
                `${example.slug}: undeclared import ${specifier}`,
              );
              continue;
            }
            const candidate = resolve(dirname(path), specifier);
            assert.ok(
              candidate.startsWith(scratch + sep),
              `${example.slug}: import escapes download: ${relative(scratch, path)} → ${specifier}`,
            );
            const candidates = [
              candidate,
              ...[".ts", ".tsx", ".js", ".mjs", ".css"].map(
                (extension) => candidate + extension,
              ),
              ...["index.ts", "index.tsx", "index.js"].map((file) =>
                join(candidate, file),
              ),
            ];
            assert.ok(
              candidates.some(existsSync),
              `${example.slug}: missing downloaded import ${relative(scratch, path)} → ${specifier}`,
            );
          }
        }
      } finally {
        await rm(scratch, { recursive: true, force: true });
      }
    },
  );
}

const turbo = join(root, "node_modules/.bin/turbo");
const turboReady =
  existsSync(turbo) && existsSync(join(root, "node_modules/turbo/bin/turbo"));
test(
  "independent preview graph does not schedule the documentation app",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    const graph = JSON.parse(
      execFileSync(
        turbo,
        ["run", "preview:build", "--filter=bundle-*", "--dry=json"],
        { cwd: root, encoding: "utf8", timeout: 30_000 },
      ),
    );
    assert.ok(graph.tasks.length > 0);
    assert.ok(
      !graph.tasks.some((task) => task.package === "@assistant-ui/docs"),
    );
    for (const example of examples) {
      const task = graph.tasks.find(
        (task) => task.taskId === `${example.package}#preview:build`,
      );
      assert.ok(task, `Missing independent build task for ${example.slug}`);
      assert.ok(
        example.entry in task.inputs,
        `Own source changes must invalidate ${example.slug}`,
      );
      assert.ok(
        Object.keys(task.inputs).some((path) =>
          path.endsWith("bundle-shared/chat.tsx"),
        ),
        `Shared chat changes must invalidate ${example.slug}`,
      );
    }
  },
);

test(
  "cached documentation builds retain public preview and source artifacts",
  {
    skip: !turboReady && "Install dependencies before testing the Turbo graph",
  },
  () => {
    const graph = JSON.parse(
      execFileSync(
        turbo,
        ["run", "build", "--filter=@assistant-ui/docs", "--dry=json"],
        { cwd: root, encoding: "utf8", timeout: 30_000 },
      ),
    );
    const docs = graph.tasks.find(
      (task) => task.taskId === "@assistant-ui/docs#build",
    );
    assert.ok(docs, "Missing documentation build task");
    const outputs = docs.resolvedTaskDefinition.outputs;
    assert.ok(
      outputs.some(
        (output) =>
          output === "public/example-bundles/**" ||
          output === "public/**" ||
          output === "**",
      ),
      "A cached documentation build must restore public example artifacts",
    );
    assert.ok(
      Object.keys(docs.inputs).some(
        (path) =>
          resolve(root, "apps/docs", path) ===
          join(root, "scripts/package-example-bundles.mjs"),
      ),
      "Packaging code changes must invalidate the documentation build",
    );
    assert.ok(
      !graph.tasks.some((task) => task.task.endsWith("preview:build")),
      "Disabled documentation builds must not depend on experimental preview builds",
    );
    for (const example of examples) {
      assert.ok(
        Object.keys(docs.inputs).some((path) =>
          path.endsWith(`${example.package}/src/main.tsx`),
        ),
        `Enabled documentation cache must track ${example.slug} source`,
      );
    }
  },
);

test("disabled preparation removes stale public artifacts without building previews", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "disabled-bundles-"));
  try {
    await mkdir(join(fixture, "scripts"));
    await cp(
      join(root, "scripts/prepare-example-bundles.mjs"),
      join(fixture, "scripts/prepare-example-bundles.mjs"),
    );
    const docs = join(fixture, "apps/docs");
    await mkdir(docs, { recursive: true });
    await writeFile(join(docs, "package.json"), "{}");
    await symlink(
      join(root, "apps/docs/node_modules"),
      join(docs, "node_modules"),
      "junction",
    );
    const stale = join(docs, "public/example-bundles/stale");
    await mkdir(stale, { recursive: true });
    execFileSync(
      process.execPath,
      [join(fixture, "scripts/prepare-example-bundles.mjs")],
      { env: { ...process.env, NEXT_PUBLIC_AUI_EXAMPLE_BUNDLES_ENABLED: "0" } },
    );
    assert.ok(!existsSync(stale));
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});

test("preparation uses Next's env-file precedence in development and production", async () => {
  const fixture = await mkdtemp(join(tmpdir(), "bundle-env-contract-"));
  const flag = "NEXT_PUBLIC_AUI_EXAMPLE_BUNDLES_ENABLED";
  try {
    const docs = join(fixture, "apps/docs");
    await mkdir(docs, { recursive: true });
    await mkdir(join(fixture, "scripts"));
    await writeFile(join(docs, "package.json"), "{}");
    await symlink(
      join(root, "apps/docs/node_modules"),
      join(docs, "node_modules"),
      "junction",
    );
    await cp(
      join(root, "scripts/prepare-example-bundles.mjs"),
      join(fixture, "scripts/prepare-example-bundles.mjs"),
    );
    for (const script of [
      "run-example-bundles.mjs",
      "package-example-bundles.mjs",
    ]) {
      await writeFile(
        join(fixture, "scripts", script),
        `import { writeFileSync } from 'node:fs'; writeFileSync('${script}.ran', '1');`,
      );
    }
    const marker = join(fixture, "package-example-bundles.mjs.ran");
    const env = { ...process.env };
    delete env[flag];
    delete env.NODE_ENV;
    delete env.__NEXT_PROCESSED_ENV;
    await writeFile(join(docs, ".env"), `${flag}=0\n`);
    await writeFile(join(docs, ".env.local"), `${flag}=1\n`);
    const prepare = (args = [], overrides = {}) =>
      execFileSync(
        process.execPath,
        [join(fixture, "scripts/prepare-example-bundles.mjs"), ...args],
        { cwd: fixture, env: { ...env, ...overrides }, stdio: "pipe" },
      );
    prepare();
    assert.ok(existsSync(marker), ".env.local enables production previews");
    await rm(marker);
    prepare([], { [flag]: "0" });
    assert.ok(!existsSync(marker), "shell environment overrides files");
    await writeFile(join(docs, ".env.production.local"), `${flag}=0\n`);
    prepare();
    assert.ok(!existsSync(marker), "production-local overrides local");
    await writeFile(join(docs, ".env.development.local"), `${flag}=1\n`);
    prepare(["--dev"]);
    assert.ok(existsSync(marker), "dev preparation selects development files");
  } finally {
    await rm(fixture, { recursive: true, force: true });
  }
});
