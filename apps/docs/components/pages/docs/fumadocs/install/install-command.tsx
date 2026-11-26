import { Tab, Tabs } from "@/components/pages/docs/fumadocs/tabs";
import { Flavored } from "@/components/pages/docs/contexts/flavor.server";
import type { LLMRenderContext } from "@/lib/get-llm-text";
import {
  resolveAllComponents,
  ComponentSourceFromFile,
  type ResolvedFile,
  type ResolvedGroup,
} from "@/components/pages/docs/fumadocs/install/component-source";
import {
  buildDownloadCommand,
  packagedFileUrl,
} from "@/components/pages/docs/fumadocs/install/packaged-file-url";
import { pairFlavorFiles } from "@/components/pages/docs/fumadocs/install/pair-flavor-files";
import { SetupInstructions } from "@/components/pages/docs/fumadocs/install/setup-instructions";
import {
  ExpoInstallTabs,
  PackageManagerTabs,
  ShadcnInstallTabs,
} from "@/components/pages/docs/fumadocs/install/package-manager-tabs";

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

const sameList = (a: readonly string[], b: readonly string[]) =>
  a.length === b.length && a.every((item, i) => item === b[i]);

function FileGroupTitle({ title }: { title: string }) {
  return (
    <h4 className="text-muted-foreground mb-3 text-sm font-medium">{title}</h4>
  );
}

function Dependencies({ packages }: { packages: string[] }) {
  if (packages.length === 0) return null;
  return (
    <div className="mb-4">
      <PackageManagerTabs packages={packages} />
    </div>
  );
}

function FlavorFileGroup({
  title,
  group,
}: {
  title: string;
  group: ResolvedGroup;
}) {
  if (group.files.length === 0) return null;
  return (
    <div className="mt-6">
      <FileGroupTitle title={title} />
      <Dependencies packages={group.dependencies} />
      {group.files.map((file, index) => (
        <ComponentSourceFromFile key={`${file.path}-${index}`} file={file} />
      ))}
    </div>
  );
}

/**
 * One group of the Manual tab for both flavors. Most registry files are the
 * same in Base UI and Radix UI; such a file renders once, outside the flavor
 * switch, and only what differs renders per flavor. Rendering the whole group
 * per flavor sent every shared file's source twice, about 260 KB on the
 * manual installation page.
 */
function FileGroup({
  title,
  base,
  radix,
}: {
  title: string;
  base: ResolvedGroup;
  radix: ResolvedGroup;
}) {
  if (base.files.length === 0 && radix.files.length === 0) return null;
  if (base.files.length === 0 || radix.files.length === 0) {
    return (
      <Flavored
        base={<FlavorFileGroup title={title} group={base} />}
        radix={<FlavorFileGroup title={title} group={radix} />}
      />
    );
  }

  const { pairs, radixOnly } = pairFlavorFiles(base.files, radix.files);
  const source = (file: ResolvedFile | undefined) =>
    file ? <ComponentSourceFromFile file={file} /> : null;

  return (
    <div className="mt-6">
      <FileGroupTitle title={title} />
      {sameList(base.dependencies, radix.dependencies) ? (
        <Dependencies packages={base.dependencies} />
      ) : (
        <Flavored
          base={<Dependencies packages={base.dependencies} />}
          radix={<Dependencies packages={radix.dependencies} />}
        />
      )}
      {pairs.map(([file, twin], index) => {
        const key = `${file.path}-${index}`;
        return twin?.content === file.content ? (
          <ComponentSourceFromFile key={key} file={file} />
        ) : (
          <Flavored key={key} base={source(file)} radix={source(twin)} />
        );
      })}
      {radixOnly.map((file, index) => (
        <Flavored
          key={`radix:${file.path}-${index}`}
          base={null}
          radix={source(file)}
        />
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
        {props.manualSetupInstructions && <SetupInstructions />}
        <FileGroup
          title="Main Component"
          base={baseResolved.main}
          radix={radixResolved.main}
        />
        <FileGroup
          title="assistant-ui dependencies"
          base={baseResolved.auiDeps}
          radix={radixResolved.auiDeps}
        />
        <FileGroup
          title="shadcn/ui dependencies"
          base={baseResolved.shadcn}
          radix={radixResolved.shadcn}
        />
      </Tab>
    </Tabs>
  );
}

const REPO = "assistant-ui/assistant-ui";
const GITHUB_BLOB = `https://github.com/${REPO}/blob/main`;

const CommandBlock = ({ command }: { command: string }) => (
  <pre>
    <code className="language-bash">{command}</code>
  </pre>
);

// Instead of dumping each component's full source (the visual Manual tab), give
// the CLI command plus a manual path: npm deps, shadcn components, and the
// registry-served aui files with one curl to fetch them all.
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
  const files: ResolvedFile[] = [
    ...resolved.main.files,
    ...resolved.auiDeps.files,
  ];
  // npm packages the copied files import. shadcn deps (e.g. radix-ui) are
  // omitted here — they install with the shadcn components below.
  const npmDeps = [
    ...new Set([
      ...resolved.main.dependencies,
      ...resolved.auiDeps.dependencies,
    ]),
  ];
  // shadcn/ui components are not part of the aui registry payloads, so
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
          <p>
            Then copy these files (packaged registry content; the source links
            show where each ships from):
          </p>
          <ul>
            {files.map((file) => (
              <li key={file.path}>
                <a href={packagedFileUrl(flavor, file)}>{file.path}</a> (
                <a href={`${GITHUB_BLOB}/${file.sourcePath}`}>source</a>)
              </li>
            ))}
          </ul>
          <CommandBlock command={buildDownloadCommand(files, flavor)} />
        </>
      )}
    </>
  );
};
