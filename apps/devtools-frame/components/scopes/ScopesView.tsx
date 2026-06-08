import { isRecord } from "../common";
import { Chip, EmptyState, SectionLabel, SummaryItem, ToneBadge } from "../ui";
import { parseScopes } from "./parse";
import type { ScopePreview } from "./types";

const SourceBadge = ({ source }: { source: string | null }) => {
  if (!source) return null;
  if (source === "root") {
    return <ToneBadge tone="emerald">root</ToneBadge>;
  }
  return <Chip>← {source}</Chip>;
};

const ScopeCard = ({ scope }: { scope: ScopePreview }) => {
  const hasQuery = isRecord(scope.query) && Object.keys(scope.query).length > 0;

  return (
    <div className="bg-card rounded-lg border p-3 text-[11px]">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground font-semibold">{scope.name}</span>
        <SourceBadge source={scope.source} />
        {hasQuery ? (
          <span className="text-muted-foreground font-mono text-[10px]">
            {JSON.stringify(scope.query)}
          </span>
        ) : null}
      </div>

      <div className="mt-2">
        <SectionLabel>Methods ({scope.methods.length})</SectionLabel>
      </div>
      {scope.methods.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {scope.methods.map((method) => (
            <Chip key={method} className="font-mono">
              {method}
            </Chip>
          ))}
        </div>
      ) : (
        <div className="text-muted-foreground mt-1">No methods.</div>
      )}
    </div>
  );
};

export const ScopesView = ({ scopes }: { scopes?: unknown }) => {
  const list = parseScopes(scopes);

  if (list.length === 0) {
    return (
      <EmptyState>
        No scopes reported. Update `@assistant-ui/react-devtools` to forward the
        scope graph.
      </EmptyState>
    );
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-2 sm:grid-cols-2">
        <SummaryItem label="Scopes" value={String(list.length)} />
        <SummaryItem
          label="Roots"
          value={String(list.filter((s) => s.source === "root").length)}
        />
      </div>
      <div className="flex flex-col gap-2">
        {list.map((scope) => (
          <ScopeCard key={scope.name} scope={scope} />
        ))}
      </div>
    </div>
  );
};
