import type {
  NormalizedTool,
  SerializedModelContext,
} from "@assistant-ui/react-devtools";
import {
  Chip,
  EmptyState,
  InfoCard,
  JSONPreview,
  SectionLabel,
  SectionTitle,
  ToneBadge,
} from "../ui";

const Field = ({ label, value }: { label: string; value: unknown }) => (
  <div className="mt-2">
    <div className="mb-1">
      <SectionLabel>{label}</SectionLabel>
    </div>
    <JSONPreview value={value} />
  </div>
);

const ToolCard = ({ tool }: { tool: NormalizedTool }) => (
  <div className="bg-card text-foreground rounded-lg border p-3 text-[11px] transition-colors">
    <div className="text-foreground flex flex-wrap items-center gap-2 font-semibold">
      <span>{tool.name}</span>
      {tool.type ? <Chip>{tool.type}</Chip> : null}
      {tool.providerId ? (
        <ToneBadge tone="violet">{tool.providerId}</ToneBadge>
      ) : null}
      {tool.display ? <Chip>{tool.display}</Chip> : null}
      {tool.supportsDeferredResults ? <Chip>deferred</Chip> : null}
      {tool.disabled ? <ToneBadge tone="amber">disabled</ToneBadge> : null}
    </div>

    {tool.description ? (
      <p className="text-muted-foreground mt-1 text-[11px]">
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
  modelContext?: SerializedModelContext | undefined;
}) => {
  const toolList = Array.isArray(modelContext?.tools) ? modelContext.tools : [];
  const system = modelContext?.system;
  const callSettings = modelContext?.callSettings;
  const config = modelContext?.config;
  const hasCallSettings = callSettings && Object.keys(callSettings).length > 0;
  const hasConfig = config && Object.keys(config).length > 0;

  if (!system && toolList.length === 0 && !hasCallSettings && !hasConfig) {
    return (
      <EmptyState>
        No model context configured for this assistant instance.
      </EmptyState>
    );
  }

  return (
    <div className="grid gap-3">
      {system ? (
        <InfoCard>
          <SectionTitle>System prompt</SectionTitle>
          <div className="bg-muted text-foreground rounded-lg p-3 text-[11px] whitespace-pre-wrap">
            {system}
          </div>
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
          <SectionTitle>Call settings</SectionTitle>
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
