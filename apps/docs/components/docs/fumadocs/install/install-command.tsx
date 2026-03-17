import { Tab, Tabs } from "@/components/docs/fumadocs/tabs";
import {
  resolveAllComponents,
  ComponentSourceFromFile,
  type ResolvedGroup,
} from "@/components/docs/fumadocs/install/component-source";
import { SetupInstructions } from "@/components/docs/fumadocs/install/setup-instructions";
import {
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
    };

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
