import { isRecord } from "../../utils/common";
import { Chip, EmptyState, SummaryItem, SummaryList, ToneBadge } from "../ui";
import { parseScopes } from "./parse";
import type { ScopePreview } from "./types";

const SourceBadge = ({ source }: { source: string | null }) => {
  if (!source) return null;
  if (source === "root") return <ToneBadge tone="emerald">root</ToneBadge>;
  return <Chip>← {source}</Chip>;
};

const ScopeNode = ({
  scope,
  scopes,
  path,
}: {
  scope: ScopePreview;
  scopes: readonly ScopePreview[];
  path: ReadonlySet<string>;
}) => {
  const hasQuery = isRecord(scope.query) && Object.keys(scope.query).length > 0;
  const children = path.has(scope.name)
    ? []
    : scopes.filter((candidate) => candidate.source === scope.name);
  const nextPath = new Set(path).add(scope.name);

  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-foreground text-[13px] font-medium">
          {scope.name}
        </span>
        <SourceBadge source={scope.source} />
        {hasQuery ? (
          <span className="text-muted-foreground font-mono text-[11px]">
            {JSON.stringify(scope.query)}
          </span>
        ) : null}
      </div>

      {scope.methods.length ? (
        <div className="flex flex-wrap gap-1.5">
          {scope.methods.map((method) => (
            <Chip key={method} className="font-mono">
              {method}
            </Chip>
          ))}
        </div>
      ) : null}

      {children.length ? (
        <div className="border-border/60 ms-1 mt-1 flex flex-col gap-3 border-s ps-3">
          {children.map((child) => (
            <ScopeNode
              key={child.name}
              scope={child}
              scopes={scopes}
              path={nextPath}
            />
          ))}
        </div>
      ) : null}
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

  const names = new Set(list.map((scope) => scope.name));
  const roots = list.filter(
    (scope) =>
      scope.source === "root" ||
      scope.source === null ||
      !names.has(scope.source),
  );

  return (
    <div className="flex flex-col gap-4">
      <SummaryList>
        <SummaryItem label="Scopes" value={String(list.length)} />
        <SummaryItem label="Roots" value={String(roots.length)} />
      </SummaryList>
      <div className="flex flex-col gap-3">
        {roots.map((scope) => (
          <ScopeNode
            key={scope.name}
            scope={scope}
            scopes={list}
            path={new Set()}
          />
        ))}
      </div>
    </div>
  );
};
