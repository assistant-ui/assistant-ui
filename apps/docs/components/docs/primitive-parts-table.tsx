import type { FC } from "react";
import { StatusBadge } from "./status-badge";

type PartDef = {
  element?: string;
  description?: string;
  deprecated?: string;
  props: Array<{ name: string; [key: string]: unknown }>;
};

type PrimitivePartsTableProps = {
  primitive: Record<string, PartDef>;
};

function firstSentence(text: string): string {
  return text.split("\n")[0]!;
}

export const PrimitivePartsTable: FC<PrimitivePartsTableProps> = ({
  primitive,
}) => {
  const entries = Object.entries(primitive);

  return (
    <div className="not-prose my-4 overflow-x-auto rounded-lg border border-border/60">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-border/60 border-b bg-muted/50">
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              Part
            </th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              Element
            </th>
            <th className="px-4 py-2 text-left font-medium text-muted-foreground">
              Description
            </th>
          </tr>
        </thead>
        <tbody>
          {entries.map(([name, part]) => (
            <tr
              key={name}
              className="border-border/50 border-b last:border-b-0"
            >
              <td className="px-4 py-2 align-top">
                <code className="font-mono text-sm">{name}</code>
                {part.deprecated && (
                  <StatusBadge variant="deprecated" className="ml-1.5" />
                )}
              </td>
              <td className="px-4 py-2 align-top text-muted-foreground">
                {part.element ? (
                  <code className="font-mono text-xs">{`<${part.element}>`}</code>
                ) : (
                  "—"
                )}
              </td>
              <td className="px-4 py-2 text-muted-foreground">
                {part.description ? firstSentence(part.description) : "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
