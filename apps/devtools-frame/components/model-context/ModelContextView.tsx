import {
  normalizeToolList,
  type NormalizedTool,
} from "@assistant-ui/react-devtools";
import type { ReactNode } from "react";
import { InfoCard, JSONPreview, SectionTitle } from "../ui";

interface ModelContextValue {
  system?: string;
  tools?: NormalizedTool[];
  callSettings?: Record<string, unknown>;
  config?: Record<string, unknown>;
}

const Badge = ({
  children,
  tone = "neutral",
}: {
  children: ReactNode;
  tone?: "neutral" | "warn" | "accent";
}) => {
  const cls =
    tone === "warn"
      ? "text-amber-600 dark:text-amber-400"
      : tone === "accent"
        ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
        : "bg-zinc-200 text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300";
  return (
    <span
      className={`rounded px-1.5 py-0.5 text-[10px] font-medium tracking-wide uppercase ${cls}`}
    >
      {children}
    </span>
  );
};

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="mt-2">
    <div className="mb-1 text-[10px] font-medium tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
      {label}
    </div>
    <JSONPreview value={value} />
  </div>
);

const ToolCard = ({ tool }: { tool: NormalizedTool }) => (
  <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] text-zinc-700 transition-colors dark:border-zinc-800 dark:bg-zinc-900/60 dark:text-zinc-200">
    <div className="flex flex-wrap items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-100">
      <span>{tool.name}</span>
      {tool.type ? <Badge>{tool.type}</Badge> : null}
      {tool.providerId ? <Badge tone="accent">{tool.providerId}</Badge> : null}
      {tool.display ? <Badge>{tool.display}</Badge> : null}
      {tool.supportsDeferredResults ? <Badge>deferred</Badge> : null}
      {tool.disabled ? <Badge tone="warn">disabled</Badge> : null}
    </div>

    {tool.description ? (
      <p className="mt-1 text-[11px] text-zinc-600 dark:text-zinc-300">
        {tool.description}
      </p>
    ) : null}

    {tool.server !== undefined ? (
      <Field label="MCP server" value={tool.server} />
    ) : null}
    {tool.providerArgs !== undefined ? (
      <Field label="Provider args" value={tool.providerArgs} />
    ) : null}
    {tool.providerOptions !== undefined ? (
      <Field label="Provider options" value={tool.providerOptions} />
    ) : null}
    {tool.backendDefault !== undefined ? (
      <Field label="Backend defaults" value={tool.backendDefault} />
    ) : null}
    {tool.parameters ? (
      <Field label="Parameters" value={tool.parameters} />
    ) : null}
  </div>
);

export const ModelContextView = ({
  modelContext,
}: {
  modelContext?: ModelContextValue | undefined;
}) => {
  const toolList = normalizeToolList(modelContext?.tools);
  const system = modelContext?.system;
  const callSettings = modelContext?.callSettings;
  const config = modelContext?.config;
  const hasCallSettings = callSettings && Object.keys(callSettings).length > 0;
  const hasConfig = config && Object.keys(config).length > 0;

  if (!system && toolList.length === 0 && !hasCallSettings && !hasConfig) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-6 text-center text-sm text-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-400">
          No model context configured for this assistant instance.
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-3">
      {system ? (
        <InfoCard>
          <SectionTitle>System Prompt</SectionTitle>
          <pre className="rounded-lg bg-zinc-100 p-3 text-[11px] whitespace-pre-wrap text-zinc-700 dark:bg-zinc-950 dark:text-zinc-200">
            {system}
          </pre>
        </InfoCard>
      ) : null}
      {toolList.length > 0 ? (
        <InfoCard>
          <SectionTitle>Tools ({toolList.length})</SectionTitle>
          <div className="flex flex-col gap-3">
            {toolList.map((tool) => (
              <ToolCard key={tool.name} tool={tool} />
            ))}
          </div>
        </InfoCard>
      ) : null}
      {hasCallSettings ? (
        <InfoCard>
          <SectionTitle>Call Settings</SectionTitle>
          <JSONPreview value={callSettings} />
        </InfoCard>
      ) : null}
      {hasConfig ? (
        <InfoCard>
          <SectionTitle>Config</SectionTitle>
          <JSONPreview value={config} />
        </InfoCard>
      ) : null}
    </div>
  );
};
