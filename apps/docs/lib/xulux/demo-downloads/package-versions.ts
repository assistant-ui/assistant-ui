type Snapshot = Record<string, string>;

const WORKSPACE_PACKAGE_JSON: Record<string, string> = {
  "@assistant-ui/react": "packages/react/package.json",
  "@assistant-ui/react-ai-sdk": "packages/react-ai-sdk/package.json",
  "@assistant-ui/react-ink": "packages/react-ink/package.json",
  "@assistant-ui/react-ink-markdown":
    "packages/react-ink-markdown/package.json",
  "@assistant-ui/react-lexical": "packages/react-lexical/package.json",
  "@assistant-ui/react-markdown": "packages/react-markdown/package.json",
};

export const DEMO_DEPENDENCIES = [
  "@ai-sdk/openai",
  "@assistant-ui/react",
  "@assistant-ui/react-ai-sdk",
  "@assistant-ui/react-lexical",
  "@assistant-ui/react-markdown",
  "@base-ui/react",
  "ai",
  "class-variance-authority",
  "clsx",
  "cmdk",
  "lucide-react",
  "next",
  "react",
  "react-dom",
  "remark-gfm",
  "tailwind-merge",
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

export function dependencyVersions(
  snapshot: Snapshot,
  names: readonly string[],
) {
  return Object.fromEntries(
    names.map((name) => [name, dependencyVersion(snapshot, name)]),
  );
}

export function dependencyVersionsFromPackage(
  snapshot: Snapshot,
  packagePath: string,
  names: readonly string[],
) {
  const pkg = packageJsonFromSnapshot(snapshot, packagePath);
  return Object.fromEntries(
    names.map((name) => {
      const version =
        pkg.dependencies?.[name] ??
        pkg.devDependencies?.[name] ??
        pkg.peerDependencies?.[name];
      if (isInstallableVersion(version)) {
        return [name, version];
      }
      return [name, dependencyVersion(snapshot, name)];
    }),
  );
}

function dependencyVersion(snapshot: Snapshot, name: string) {
  const workspacePackagePath = WORKSPACE_PACKAGE_JSON[name];
  if (workspacePackagePath) {
    const pkg = packageJsonFromSnapshot(snapshot, workspacePackagePath);
    if (typeof pkg.version === "string" && pkg.version) {
      return `^${pkg.version}`;
    }
  }

  const docsPkg = packageJsonFromSnapshot(snapshot, "apps/docs/package.json");
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

function packageJsonFromSnapshot(snapshot: Snapshot, snapshotKey: string) {
  const raw = snapshot[snapshotKey];
  if (typeof raw !== "string") {
    throw new Error(
      `Missing package metadata in source snapshot: ${snapshotKey}`,
    );
  }
  return JSON.parse(raw) as {
    version?: string;
    dependencies?: Record<string, string>;
    devDependencies?: Record<string, string>;
    peerDependencies?: Record<string, string>;
  };
}
