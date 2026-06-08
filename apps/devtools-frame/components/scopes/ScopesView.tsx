import { isRecord } from "../common";
import { EmptyState, SummaryItem } from "../ui";
import { parseScopes } from "./parse";
import type { ScopePreview } from "./types";

const SourceBadge = ({ source }: { source: string | null }) => {
  if (!source) return null;
  if (source === "root") {
    return (
      <span className="rounded border border-emerald-300 bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-emerald-700 uppercase dark:border-emerald-500/40 dark:text-emerald-300">
        root
      </span>
    );
  }
  return (
    <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-[10px] font-medium text-zinc-600 dark:bg-zinc-800 dark:text-zinc-300">
      ← {source}
    </span>
  );
};

const ScopeCard = ({ scope }: { scope: ScopePreview }) => {
  const hasQuery = isRecord(scope.query) && Object.keys(scope.query).length > 0;

  return (
    <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3 text-[11px] dark:border-zinc-800 dark:bg-zinc-900/40">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-semibold text-zinc-800 dark:text-zinc-100">
          {scope.name}
        </span>
        <SourceBadge source={scope.source} />
        {hasQuery ? (
          <span className="font-mono text-[10px] text-zinc-500 dark:text-zinc-400">
            {JSON.stringify(scope.query)}
          </span>
        ) : null}
      </div>

      <div className="mt-2 text-[10px] font-semibold tracking-wide text-zinc-500 uppercase dark:text-zinc-400">
        Methods ({scope.methods.length})
      </div>
      {scope.methods.length ? (
        <div className="mt-1 flex flex-wrap gap-1">
          {scope.methods.map((method) => (
            <span
              key={method}
              className="rounded bg-zinc-200 px-1.5 py-0.5 font-mono text-[10px] text-zinc-700 dark:bg-zinc-800 dark:text-zinc-200"
            >
              {method}
            </span>
          ))}
        </div>
      ) : (
        <div className="mt-1 text-zinc-400">No methods.</div>
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
