import { PartDisclosure } from "../message/PartDisclosure";
import { ScopesView } from "../scopes";
import { JSONTree } from "../ui";
import { renderStatePreview } from "./statePreview";
import type { RawNode } from "./rawNodes";

export const RawDetail = ({
  node,
  state,
  scopes,
}: {
  node: RawNode;
  state: Record<string, unknown>;
  scopes: unknown;
}) => {
  if (node.kind === "scopes") {
    return (
      <div className="flex flex-col gap-3">
        <ScopesView scopes={scopes} />
        {scopes !== undefined ? (
          <PartDisclosure label="Raw JSON">
            <JSONTree value={scopes} openDepth={1} compact />
          </PartDisclosure>
        ) : null}
      </div>
    );
  }

  const value = state[node.key];

  return (
    <div className="flex flex-col gap-3">
      {renderStatePreview(node.key, value)}
      <PartDisclosure label="Raw JSON">
        <JSONTree value={value} openDepth={1} compact />
      </PartDisclosure>
    </div>
  );
};
