import type { ReactNode } from "react";
import type {
  BlockImport,
  BlockImportKind,
} from "@/components/pages/blocks/block-source";
import { CodeBlock } from "@/components/ui/code-block";
import type { Block } from "@/lib/blocks";
import { cn } from "@/lib/utils";

const box = "border-foreground/10 overflow-hidden rounded-2xl border";
const cells = "-mr-px -mb-px grid";
const cell = "border-foreground/10 border-r border-b p-5";
const rows = "border-foreground/10 divide-foreground/10 divide-y border-t";

export function BlockSection({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={`${id}-label`}
      className="border-foreground/10 scroll-mt-24 border-t py-10 md:py-12"
    >
      <h2 id={`${id}-label`} className="text-sm font-medium">
        {label}
      </h2>
      <div className="mt-6">{children}</div>
    </section>
  );
}

function Index({ value }: { value: number }) {
  return (
    <span className="text-muted-foreground text-xs tabular-nums">
      {String(value).padStart(2, "0")}
    </span>
  );
}

export function UseCases({ useCases }: Pick<Block, "useCases">) {
  return (
    <BlockSection id="use-cases" label="Use cases">
      <ol className={rows}>
        {useCases.map((useCase, index) => (
          <li key={useCase} className="flex items-baseline gap-6 py-4">
            <Index value={index + 1} />
            <p className="max-w-2xl text-[15px] leading-relaxed">{useCase}</p>
          </li>
        ))}
      </ol>
    </BlockSection>
  );
}

export function Capabilities({ capabilities }: Pick<Block, "capabilities">) {
  return (
    <BlockSection id="capabilities" label="Capabilities">
      <div className={box}>
        <dl className={cn(cells, "sm:grid-cols-2 lg:grid-cols-3")}>
          {capabilities.map((capability) => (
            <div key={capability.title} className={cell}>
              <dt className="text-sm font-medium">{capability.title}</dt>
              <dd className="text-muted-foreground mt-1.5 text-sm leading-relaxed">
                {capability.description}
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </BlockSection>
  );
}

const KINDS: readonly { kind: BlockImportKind; label: string }[] = [
  { kind: "hook", label: "Hooks" },
  { kind: "primitive", label: "Primitives" },
  { kind: "component", label: "Components" },
  { kind: "runtime", label: "Runtime" },
  { kind: "type", label: "Types" },
];

export function AssistantUi({ imports }: { imports: readonly BlockImport[] }) {
  const groups = KINDS.map((group) => ({
    ...group,
    items: imports.filter((entry) => entry.kind === group.kind),
  })).filter((group) => group.items.length > 0);

  return (
    <BlockSection id="from-assistant-ui" label="From assistant-ui">
      <dl className={rows}>
        {groups.map((group) => (
          <div
            key={group.kind}
            className="grid gap-x-12 gap-y-1.5 py-4 md:grid-cols-[14rem_minmax(0,1fr)]"
          >
            <dt className="flex items-baseline gap-2.5 text-sm font-medium">
              {group.label}
              <span className="text-muted-foreground text-xs font-normal tabular-nums">
                {group.items.length}
              </span>
            </dt>
            <dd className="min-w-0">
              <ul className="flex flex-wrap gap-x-5 gap-y-2 font-mono text-[13px] [font-variant-ligatures:none]">
                {group.items.map((entry) => (
                  <li key={`${entry.source} ${entry.name}`}>
                    {entry.name}
                    {entry.parts.length > 0 && (
                      <span className="text-muted-foreground text-xs">
                        {entry.parts.map((part) => ` .${part}`).join("")}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            </dd>
          </div>
        ))}
      </dl>
    </BlockSection>
  );
}

export function Requirements({ requirements }: Pick<Block, "requirements">) {
  return (
    <BlockSection id="requirements" label="Requirements">
      <div className={box}>
        <ol className={cn(cells, "md:grid-cols-3")}>
          {requirements.map((requirement, index) => (
            <li key={requirement} className={cell}>
              <Index value={index + 1} />
              <p className="mt-3 text-sm leading-relaxed">{requirement}</p>
            </li>
          ))}
        </ol>
      </div>
    </BlockSection>
  );
}

export function EnvironmentVariables({
  env,
  example,
}: Pick<Block, "env"> & { example: string }) {
  return (
    <BlockSection id="environment-variables" label="Environment variables">
      <p className="text-muted-foreground max-w-2xl text-sm leading-relaxed">
        {env.note}
      </p>
      <CodeBlock
        className="mt-6 mb-0 max-w-2xl rounded-2xl"
        title=".env.example"
        copyText={example}
      >
        <pre>
          <code>{example}</code>
        </pre>
      </CodeBlock>
    </BlockSection>
  );
}
