import type { NormalizedTool } from "../../utils/toolNormalization";
import { PartDisclosure } from "../message/PartDisclosure";
import { Chip, JSONTree, ToneBadge } from "../ui";

export const SystemPromptPane = ({ system }: { system: string }) => (
  <div className="text-foreground text-[12px] wrap-break-word whitespace-pre-wrap">
    {system}
  </div>
);

export const ToolDetailPane = ({ tool }: { tool: NormalizedTool }) => (
  <div className="flex flex-col gap-2">
    <div className="flex flex-wrap items-center gap-1.5">
      {tool.type ? <Chip>{tool.type}</Chip> : null}
      {tool.providerId ? (
        <ToneBadge tone="violet" size="sm">
          {tool.providerId}
        </ToneBadge>
      ) : null}
      {tool.display ? <Chip>{tool.display}</Chip> : null}
      {tool.supportsDeferredResults ? <Chip>deferred</Chip> : null}
      {tool.disabled ? (
        <ToneBadge tone="amber" size="sm">
          disabled
        </ToneBadge>
      ) : null}
    </div>

    {tool.description ? (
      <p className="text-muted-foreground text-[11px] leading-snug">
        {tool.description}
      </p>
    ) : null}

    {tool.parameters !== undefined ? (
      <PartDisclosure label="Parameters">
        <JSONTree value={tool.parameters} openDepth={0} compact />
      </PartDisclosure>
    ) : null}
    {tool.providerArgs !== undefined ? (
      <PartDisclosure label="Provider args">
        <JSONTree value={tool.providerArgs} openDepth={0} compact />
      </PartDisclosure>
    ) : null}
    {tool.providerOptions !== undefined ? (
      <PartDisclosure label="Provider options">
        <JSONTree value={tool.providerOptions} openDepth={0} compact />
      </PartDisclosure>
    ) : null}
    {tool.backendDefault !== undefined ? (
      <PartDisclosure label="Backend defaults">
        <JSONTree value={tool.backendDefault} openDepth={0} compact />
      </PartDisclosure>
    ) : null}
    {tool.server !== undefined ? (
      <PartDisclosure label="MCP server">
        <JSONTree value={tool.server} openDepth={0} compact />
      </PartDisclosure>
    ) : null}
  </div>
);

export const CallSettingsPane = ({
  value,
}: {
  value: Record<string, unknown>;
}) => <JSONTree value={value} openDepth={1} compact />;

export const ConfigPane = ({ value }: { value: Record<string, unknown> }) => (
  <JSONTree value={value} openDepth={1} compact />
);
