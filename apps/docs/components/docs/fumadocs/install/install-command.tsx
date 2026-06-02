import { Tab, Tabs } from "@/components/docs/fumadocs/tabs";
import {
  resolveAllComponents,
  ComponentSourceFromFile,
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
  const urls = components.map((c) => `https://r.assistant-ui.com/${c}.json`);

  const resolved = await resolveAllComponents(props.shadcn);

  return (
    <Tabs items={["CLI", "Manual"]}>
      <Tab>
        <ShadcnInstallTabs urls={urls} />
      </Tab>
      <Tab>
        {props.manualSetupInstructions && <SetupInstructions />}
        <FileGroup title="Main Component" group={resolved.main} />
        <FileGroup title="assistant-ui dependencies" group={resolved.auiDeps} />
        <FileGroup title="shadcn/ui dependencies" group={resolved.shadcn} />
      </Tab>
    </Tabs>
  );
}

// Every resolvable file is an assistant-ui component, sourced from packages/ui.
const GITHUB_BLOB =
  "https://github.com/assistant-ui/assistant-ui/blob/main/packages/ui/src";
const GITHUB_RAW =
  "https://raw.githubusercontent.com/assistant-ui/assistant-ui/main/packages/ui/src";

const CommandBlock = ({ command }: { command: string }) => (
  <pre>
    <code className="language-bash">{command}</code>
  </pre>
);

function buildDownloadCommand(files: ResolvedFile[]): string {
  const args = files
    .map((file) => `  -o ${file.path} ${GITHUB_RAW}/${file.path}`)
    .join(" \\\n");
  return `curl -sSL --create-dirs \\\n${args}`;
}

// Instead of dumping each component's full source (the visual Manual tab), keep
// the CLI command and link the GitHub files plus one curl to fetch them all.
export const InstallCommandLLM = async (props: InstallCommandProps) => {
  if ("npm" in props) {
    return <CommandBlock command={`npm install ${props.npm.join(" ")}`} />;
  }
  if ("expo" in props) {
    return (
      <CommandBlock command={`npx expo install ${props.expo.join(" ")}`} />
    );
  }

  const urls = props.shadcn.map((c) => `https://r.assistant-ui.com/${c}.json`);
  const resolved = await resolveAllComponents(props.shadcn);
  const files = [...resolved.main.files, ...resolved.auiDeps.files];

  return (
    <>
      <CommandBlock command={`npx shadcn@latest add ${urls.join(" ")}`} />
      {files.length > 0 && (
        <>
          <p>Or copy the source files from GitHub:</p>
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <a href={`${GITHUB_BLOB}/${file.path}`}>{file.path}</a>
              </li>
            ))}
          </ul>
          <CommandBlock command={buildDownloadCommand(files)} />
        </>
      )}
    </>
  );
};
