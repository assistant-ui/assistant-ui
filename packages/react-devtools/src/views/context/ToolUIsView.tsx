import { isRecord, truncate } from "../../utils/common";
import { Chip, JSONTree } from "../ui";

export const ToolUIsView = ({ value }: { value: unknown }) => {
  if (!isRecord(value)) {
    return <JSONTree value={value} compact />;
  }

  const entries = Object.entries(value);
  if (entries.length === 0) {
    return (
      <div className="text-muted-foreground text-[12px]">
        No tool UI mappings registered.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-2">
      {entries.map(([toolName, components]) => {
        const list = Array.isArray(components) ? components : [];
        const firstEntry = typeof list[0] === "string" ? list[0] : undefined;

        return (
          <div key={toolName} className="flex min-w-0 flex-col gap-0.5 py-1">
            <div className="flex min-w-0 items-center justify-between gap-2">
              <span className="text-foreground truncate text-[12px] font-medium">
                {toolName}
              </span>
              <Chip>
                {list.length} component{list.length === 1 ? "" : "s"}
              </Chip>
            </div>
            {firstEntry ? (
              <span className="text-muted-foreground truncate font-mono text-[10px]">
                {truncate(firstEntry, 96)}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
};
