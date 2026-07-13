import fs from "node:fs";
import path from "node:path";
import { Tab, Tabs } from "@/components/docs/fumadocs/tabs";
import { Flavored } from "@/components/docs/contexts/flavor.server";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import {
  resolveAllComponents,
  ComponentSourceFromFile,
  type RegistryFlavor,
  type ResolvedComponents,
  type ResolvedFile,
  type ResolvedGroup,
} from "@/components/docs/fumadocs/install/component-source";
import { SetupInstructions } from "@/components/docs/fumadocs/install/setup-instructions";
import {
  ExpoInstallTabs,
  PackageManagerTabs,
  ShadcnInstallTabs,
} from "@/components/docs/fumadocs/install/package-manager-tabs";

type InstallCommandProps =
  | {
      /** Shadcn registry components to install (will be prefixed with @assistant-ui/) */
      shadcn: string[];
      /** Show manual setup instructions for React, Tailwind, shadcn/ui */
      manualSetupInstructions?: boolean;
    }
  | {
      /** NPM packages to install */
      npm: string[];
    }
  | {
      /** Expo packages to install with `expo install` */
      expo: string[];
    };

function FileGroup({ title, group }: { title: string; group: ResolvedGroup }) {
  if (group.files.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="text-muted-foreground mb-3 text-sm font-medium">
        {title}
      </h4>
      {group.dependencies.length > 0 && (
        <div className="mb-4">
          <PackageManagerTabs packages={group.dependencies} />
        </div>
      )}
      {group.files.map((file, index) => (
        <ComponentSourceFromFile key={`${file.path}-${index}`} file={file} />
      ))}
    </div>
  );
}

export async function InstallCommand(props: InstallCommandProps) {
  if ("npm" in props) {
    return <PackageManagerTabs packages={props.npm} />;
  }

  if ("expo" in props) {
    return <ExpoInstallTabs packages={props.expo} />;
  }

  const components = props.shadcn;
  const radixUrls = components.map(
    (c) => `https://r.assistant-ui.com/${c}.json`,
  );
  const baseUrls = components.map(
    (c) => `https://r.assistant-ui.com/base/${c}.json`,
  );

  const [radixResolved, baseResolved] = await Promise.all([
    resolveAllComponents(components, "radix"),
    resolveAllComponents(components, "base"),
  ]);

  const manualFor = (resolved: ResolvedComponents) => (
    <>
      {props.manualSetupInstructions && <SetupInstructions />}
      <FileGroup title="Main Component" group={resolved.main} />
      <FileGroup title="assistant-ui dependencies" group={resolved.auiDeps} />
      <FileGroup title="shadcn/ui dependencies" group={resolved.shadcn} />
    </>
  );

  const namespaced = components.map((c) => `@assistant-ui/${c}`);

  return (
    <Tabs items={["CLI", "Manual"]}>
      <Tab>
        <ShadcnInstallTabs urls={namespaced} />
        <p className="text-muted-foreground mt-3 text-sm">
          The <code>@assistant-ui</code> namespace resolves the Radix or Base UI
          flavor from your project&apos;s style through the{" "}
          <a href="/docs/base-ui" className="underline underline-offset-2">
            style-aware registry
          </a>{" "}
          entry in <code>components.json</code>. Without that entry, add by
          direct URL instead:
        </p>
        <Flavored
          radix={<ShadcnInstallTabs urls={radixUrls} />}
          base={<ShadcnInstallTabs urls={baseUrls} />}
        />
      </Tab>
      <Tab>
        <Flavored
          radix={manualFor(radixResolved)}
          base={manualFor(baseResolved)}
        />
      </Tab>
    </Tabs>
  );
}

// Every resolvable file is an assistant-ui component, sourced from packages/ui.
const REPO = "assistant-ui/assistant-ui";
const UI_SRC = "packages/ui/src";
const GITHUB_BLOB = `https://github.com/${REPO}/blob/main/${UI_SRC}`;
const GITHUB_RAW = `https://raw.githubusercontent.com/${REPO}/main/${UI_SRC}`;

const CommandBlock = ({ command }: { command: string }) => (
  <pre>
    <code className="language-bash">{command}</code>
  </pre>
);

function githubSourcePath(filePath: string, flavor: RegistryFlavor): string {
  if (flavor !== "base") return filePath;
  const basePath = filePath.replace(/\.tsx$/, ".base.tsx");
  return fs.existsSync(
    path.join(process.cwd(), "../../packages/ui/src", basePath),
  )
    ? basePath
    : filePath;
}

type LinkedFile = ResolvedFile & { sourcePath: string };

function buildDownloadCommand(files: LinkedFile[]): string {
  const args = files
    .map((file) => `  -o ${file.path} ${GITHUB_RAW}/${file.sourcePath}`)
    .join(" \\\n");
  return `curl -sSL --create-dirs \\\n${args}`;
}

// Instead of dumping each component's full source (the visual Manual tab), give
// the CLI command plus a manual path: npm deps, shadcn components, and the
// GitHub-linked aui files with one curl to fetch them all.
export const InstallCommandLLM = async (
  props: InstallCommandProps,
  ctx?: LLMRenderContext,
) => {
  if ("npm" in props) {
    return <CommandBlock command={`npm install ${props.npm.join(" ")}`} />;
  }
  if ("expo" in props) {
    return (
      <CommandBlock command={`npx expo install ${props.expo.join(" ")}`} />
    );
  }

  const flavor = ctx?.flavor ?? "base";
  const namespaced = props.shadcn.map((c) => `@assistant-ui/${c}`);
  const urls = props.shadcn.map((c) =>
    flavor === "base"
      ? `https://r.assistant-ui.com/base/${c}.json`
      : `https://r.assistant-ui.com/${c}.json`,
  );
  const resolved = await resolveAllComponents(props.shadcn, flavor);
  const files: LinkedFile[] = [
    ...resolved.main.files,
    ...resolved.auiDeps.files,
  ].map((file) => ({
    ...file,
    sourcePath: githubSourcePath(file.path, flavor),
  }));
  // npm packages the copied files import. shadcn deps (e.g. radix-ui) are
  // omitted here — they install with the shadcn components below.
  const npmDeps = [
    ...new Set([
      ...resolved.main.dependencies,
      ...resolved.auiDeps.dependencies,
    ]),
  ];
  // shadcn/ui components can't be GitHub-linked (not under packages/ui/src), so
  // the manual path adds them via the shadcn CLI instead.
  const shadcnComponents = resolved.shadcn.files.map((file) => file.name);

  return (
    <>
      <p>
        With the style-aware registry configured in components.json
        (&quot;@assistant-ui&quot;:
        &quot;https://r.assistant-ui.com/styles/&#123;style&#125;/&#123;name&#125;.json&quot;),
        the flavor resolves from the project style automatically:
      </p>
      <CommandBlock command={`npx shadcn@latest add ${namespaced.join(" ")}`} />
      <p>Or add by direct URL without registry configuration:</p>
      <CommandBlock command={`npx shadcn@latest add ${urls.join(" ")}`} />
      {files.length > 0 && (
        <>
          <p>Or install manually:</p>
          {npmDeps.length > 0 && (
            <CommandBlock command={`npm install ${npmDeps.join(" ")}`} />
          )}
          {shadcnComponents.length > 0 && (
            <CommandBlock
              command={`npx shadcn@latest add ${shadcnComponents.join(" ")}`}
            />
          )}
          <p>Then copy these source files from GitHub:</p>
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <a href={`${GITHUB_BLOB}/${file.sourcePath}`}>{file.path}</a>
              </li>
            ))}
          </ul>
          <CommandBlock command={buildDownloadCommand(files)} />
        </>
      )}
    </>
  );
};
