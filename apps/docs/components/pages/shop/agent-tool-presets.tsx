import { AGENT_TOOL_PRESETS } from "@/lib/catalog/agent-tool-config";
import { AgentToolDialog } from "./agent-tool-dialog";

export function AgentToolPresets({
  headingLevel = 3,
}: {
  headingLevel?: 2 | 3;
}) {
  const Heading = headingLevel === 2 ? "h2" : "h3";
  const ToolHeading = headingLevel === 2 ? "h3" : "h4";
  return (
    <div className="mt-8">
      <p className="text-muted-foreground text-sm leading-relaxed">
        Choose what each tool should do before adding it to your cart. Add Agent
        Tool again for every action you need.
      </p>
      <Heading className="text-sm font-medium">
        Start with a standard tool
      </Heading>
      <ul className="mt-4 grid gap-x-16 gap-y-6 lg:grid-cols-2">
        {AGENT_TOOL_PRESETS.map((preset) => (
          <li
            key={preset.id}
            className="flex flex-wrap items-start gap-x-6 gap-y-3"
          >
            <div className="min-w-0 flex-1 basis-64">
              <ToolHeading className="text-[0.9375rem] font-medium">
                {preset.name}
              </ToolHeading>
              <p className="text-muted-foreground mt-1 text-sm leading-relaxed">
                {preset.purpose}
              </p>
            </div>
            <AgentToolDialog presetId={preset.id} variant="outline" />
          </li>
        ))}
      </ul>
    </div>
  );
}
