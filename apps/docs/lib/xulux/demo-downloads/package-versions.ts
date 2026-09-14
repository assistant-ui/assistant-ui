import type { RepoSourceReader } from "@/lib/repo-source";

type PackageJson = {
  version?: string;
  dependencies?: Record<string, string>;
  devDependencies?: Record<string, string>;
  peerDependencies?: Record<string, string>;
};

export type PackageJsonReader = (snapshotKey: string) => Promise<PackageJson>;

const WORKSPACE_PACKAGE_JSON: Record<string, string> = {
  "@assistant-ui/ai-sdk": "packages/ai-sdk/package.json",
  "@assistant-ui/react": "packages/react/package.json",
  "@assistant-ui/react-ink": "packages/react-ink/package.json",
  "@assistant-ui/react-ink-markdown":
    "packages/react-ink-markdown/package.json",
  "@assistant-ui/react-lexical": "packages/react-lexical/package.json",
  "@assistant-ui/react-markdown": "packages/react-markdown/package.json",
};

export const DEMO_DEPENDENCIES = [
  "@ai-sdk/openai",
  "@assistant-ui/ai-sdk",
  "@assistant-ui/react",
  "@assistant-ui/react-lexical",
  "@assistant-ui/react-markdown",
  "@base-ui/react",
  "ai",
  "class-variance-authority",
  "cmdk",
  "cn",
  "lucide-react",
  "next",
  "react",
  "react-dom",
  "remark-gfm",
  "tw-animate-css",
  "zod",
  "zustand",
] as const;

export const DEMO_DEV_DEPENDENCIES = [
  "@tailwindcss/postcss",
  "@types/node",
  "@types/react",
  "@types/react-dom",
  "tailwindcss",
  "typescript",
] as const;

export async function dependencyVersions(
  readPackageJson: PackageJsonReader,
  names: readonly string[],
) {
  return Object.fromEntries(
    await Promise.all(
      names.map(async (name): Promise<[string, string]> => [
        name,
        await dependencyVersion(readPackageJson, name),
      ]),
    ),
  );
}

export async function dependencyVersionsFromPackage(
  readPackageJson: PackageJsonReader,
  packagePath: string,
  names: readonly string[],
) {
  const pkg = await readPackageJson(packagePath);
  return Object.fromEntries(
    await Promise.all(
      names.map(async (name): Promise<[string, string]> => {
        const version =
          pkg.dependencies?.[name] ??
          pkg.devDependencies?.[name] ??
          pkg.peerDependencies?.[name];
        if (isInstallableVersion(version)) {
          return [name, version];
        }
        return [name, await dependencyVersion(readPackageJson, name)];
      }),
    ),
  );
}

async function dependencyVersion(
  readPackageJson: PackageJsonReader,
  name: string,
) {
  const workspacePackagePath = WORKSPACE_PACKAGE_JSON[name];
  if (workspacePackagePath) {
    const pkg = await readPackageJson(workspacePackagePath);
    if (typeof pkg.version === "string" && pkg.version) {
      return `^${pkg.version}`;
    }
  }

  const docsPkg = await readPackageJson("apps/docs/package.json");
  const version =
    docsPkg.dependencies?.[name] ??
    docsPkg.devDependencies?.[name] ??
    docsPkg.peerDependencies?.[name];

  if (isInstallableVersion(version)) {
    return version;
  }

  throw new Error(`No installable version found for ${name}.`);
}

function isInstallableVersion(version: unknown): version is string {
  return (
    typeof version === "string" &&
    version.length > 0 &&
    !version.startsWith("workspace:")
  );
}

// Every dependency falls back to the docs manifest, so a request would
// otherwise read and parse the same file once per name.
export function createPackageJsonReader(
  reader: RepoSourceReader,
): PackageJsonReader {
  const parsed = new Map<string, Promise<PackageJson>>();

  return (snapshotKey) => {
    const cached = parsed.get(snapshotKey);
    if (cached) return cached;

    const pending = readPackageJson(reader, snapshotKey);
    parsed.set(snapshotKey, pending);
    return pending;
  };
}

async function readPackageJson(
  reader: RepoSourceReader,
  snapshotKey: string,
): Promise<PackageJson> {
  const raw = await reader.readFile(snapshotKey);
  if (typeof raw !== "string") {
    throw new Error(
      `Missing package metadata in source snapshot: ${snapshotKey}`,
    );
  }
  return JSON.parse(raw) as PackageJson;
}
