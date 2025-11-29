import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { Tab, Tabs } from "fumadocs-ui/components/tabs";
import {
  resolveAllComponents,
  ComponentSourceFromFile,
  type ResolvedGroup,
} from "./component-source";
import { SetupInstructions } from "./setup-instructions";

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
    };

const PACKAGE_MANAGERS = ["npm", "yarn", "pnpm", "bun", "xpm"] as const;

function getInstallCommand(
  pm: (typeof PACKAGE_MANAGERS)[number],
  packages: string[],
): string {
  const pkgList = packages.join(" ");
  switch (pm) {
    case "npm":
      return `npm install ${pkgList}`;
    case "yarn":
      return `yarn add ${pkgList}`;
    case "pnpm":
      return `pnpm add ${pkgList}`;
    case "bun":
      return `bun add ${pkgList}`;
    case "xpm":
      return `xpm add ${pkgList}`;
  }
}

function PackageManagerTabs({ packages }: { packages: string[] }) {
  return (
    <Tabs groupId="pm" items={[...PACKAGE_MANAGERS]}>
      {PACKAGE_MANAGERS.map((pm) => (
        <Tab key={pm}>
          <DynamicCodeBlock
            lang="bash"
            code={getInstallCommand(pm, packages)}
          />
        </Tab>
      ))}
    </Tabs>
  );
}

function FileGroup({ title, group }: { title: string; group: ResolvedGroup }) {
  if (group.files.length === 0) return null;

  return (
    <div className="mt-6">
      <h4 className="mb-3 font-medium text-muted-foreground text-sm">
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

  const components = props.shadcn;
  const shadcnCmd = `npx shadcn@latest add ${components.map((c) => `@assistant-ui/${c}`).join(" ")}`;

  // Resolve all components and their dependencies
  const resolved = await resolveAllComponents(props.shadcn);

  return (
    <Tabs items={["shadcn", "Manual"]}>
      <Tab>
        <DynamicCodeBlock lang="bash" code={shadcnCmd} />
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
