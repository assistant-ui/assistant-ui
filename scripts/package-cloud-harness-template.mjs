import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import {
  cpSync,
  mkdtempSync,
  mkdirSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const source = path.resolve(
  process.argv[2] ?? path.join(root, "../harness-sdk"),
);
const vendor = path.join(root, "templates/cloud-harness/vendor");
const packages = [
  "packages/harness-sdk/core",
  "packages/harness-sdk/assistant-ui",
  "packages/statewire/core",
];
const revision = execFileSync("git", ["rev-parse", "HEAD"], {
  cwd: source,
  encoding: "utf8",
}).trim();
const changes = execFileSync(
  "git",
  ["status", "--porcelain", "--", ...packages],
  { cwd: source, encoding: "utf8" },
);
if (changes !== "")
  throw new Error(
    "Commit harness runtime changes before packaging the template",
  );
const builder = path.join(
  source,
  "node_modules/@assistant-ui/x-buildutils/bin/aui-build.js",
);
for (const directory of packages)
  execFileSync(process.execPath, [builder], {
    cwd: path.join(source, directory),
    stdio: "inherit",
  });

const stage = mkdtempSync(path.join(tmpdir(), "cloud-harness-template-"));
const artifacts = [];
try {
  mkdirSync(vendor, { recursive: true });
  for (const directory of packages) {
    const location = path.join(source, directory);
    const original = JSON.parse(
      readFileSync(path.join(location, "package.json"), "utf8"),
    );
    const destination = path.join(stage, original.name.replaceAll("/", "-"));
    mkdirSync(destination);
    cpSync(path.join(location, "dist"), path.join(destination, "dist"), {
      recursive: true,
    });
    cpSync(path.join(source, "LICENSE"), path.join(destination, "LICENSE"));
    const {
      scripts,
      devDependencies,
      private: privatePackage,
      ...published
    } = original;
    published.license = "MIT";
    published.files = ["dist", "LICENSE"];
    const normalizations = [];
    for (const name of [
      "@assistant-ui/core",
      "@assistant-ui/store",
      "@assistant-ui/tap",
    ])
      if (published.dependencies?.[name]) {
        const specifier = published.dependencies[name];
        delete published.dependencies[name];
        published.peerDependencies[name] = specifier;
        normalizations.push(`${name} becomes a required peer ${specifier}`);
      }
    if (published.dependencies?.["harness-sdk"] === "workspace:*") {
      const harness = JSON.parse(
        readFileSync(path.join(source, packages[0], "package.json"), "utf8"),
      );
      delete published.dependencies["harness-sdk"];
      published.peerDependencies["harness-sdk"] = `^${harness.version}`;
      normalizations.push(
        `harness-sdk dependency becomes a required peer ^${harness.version}`,
      );
    }
    if (published.dependencies?.statewire) {
      const specifier = published.dependencies.statewire;
      delete published.dependencies.statewire;
      published.peerDependencies.statewire = specifier;
      normalizations.push(`statewire becomes a required peer ${specifier}`);
    }
    for (const field of [
      "dependencies",
      "peerDependencies",
      "optionalDependencies",
    ])
      for (const spec of Object.values(published[field] ?? {}))
        if (spec.startsWith("workspace:") || spec.startsWith("file:"))
          throw new Error(
            `Unresolved local dependency in ${original.name}: ${spec}`,
          );
    writeFileSync(
      path.join(destination, "package.json"),
      `${JSON.stringify(published, null, 2)}\n`,
    );
    const output = execFileSync(
      "npm",
      ["pack", "--ignore-scripts", "--json", "--pack-destination", vendor],
      { cwd: destination, encoding: "utf8" },
    );
    const [{ filename }] = JSON.parse(output);
    const sha256 = createHash("sha256")
      .update(readFileSync(path.join(vendor, filename)))
      .digest("hex");
    artifacts.push({
      name: original.name,
      version: original.version,
      directory,
      normalizations,
      filename,
      sha256,
    });
  }
  for (const filename of readdirSync(vendor))
    if (
      filename.endsWith(".tgz") &&
      !artifacts.some((artifact) => artifact.filename === filename)
    )
      rmSync(path.join(vendor, filename));
  const manifestFile = path.join(root, "templates/cloud-harness/package.json");
  const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
  for (const artifact of artifacts)
    manifest.dependencies[artifact.name] = `file:vendor/${artifact.filename}`;
  writeFileSync(manifestFile, `${JSON.stringify(manifest, null, 2)}\n`);
  cpSync(path.join(source, "LICENSE"), path.join(vendor, "LICENSE"));
  writeFileSync(
    path.join(vendor, "provenance.json"),
    `${JSON.stringify({ repository: "https://github.com/assistant-ui/harness-sdk", revision, artifacts }, null, 2)}\n`,
  );
  writeFileSync(
    path.join(vendor, "README.md"),
    `# Harness runtime packages\n\nThese MIT-licensed packages are built from [harness-sdk revision ${revision}](https://github.com/assistant-ui/harness-sdk/tree/${revision}). They compose the existing hosted harness runtime and assistant-ui adapter.\n\nPackage names, source directories, versions, and archive SHA-256 hashes are recorded in [provenance.json](provenance.json). Each archive includes its license.\n\nFrom an assistant-ui source checkout, reproduce them with:\n\n\`\`\`sh\nnode scripts/package-cloud-harness-template.mjs /path/to/harness-sdk\n\`\`\`\n\nThe harness-sdk checkout must have its dependencies installed and the package source directories clean. The script builds the packages with their existing \`aui-build\` tool and packs them without publishing.\n`,
  );
} finally {
  rmSync(stage, { recursive: true, force: true });
}
