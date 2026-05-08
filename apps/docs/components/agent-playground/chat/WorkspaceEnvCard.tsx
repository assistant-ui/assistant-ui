import { PlusIcon, Trash2Icon } from "lucide-react";
import { useMemo, useState } from "react";
import type {
  SubmitWorkspaceEnvInput,
  WorkspaceEnvFile,
  WorkspaceEnvValueInput,
} from "@/components/agent-playground/augment/types";
import type { PendingWorkspaceEnvRequest } from "@/components/agent-playground/runtime/assistantTypes";

const MAX_ENV_ROWS = 3;
const SCOPE_HELP =
  "Use temporary development keys. Values are scoped to this workspace and are not included in exports.";

type EnvRow = WorkspaceEnvValueInput & {
  required: boolean;
};

export function WorkspaceEnvCard({
  requests,
  onSubmit,
  onContinueWithout,
}: {
  requests: PendingWorkspaceEnvRequest[];
  onSubmit: (input: SubmitWorkspaceEnvInput) => void | Promise<void>;
  onContinueWithout: (requestId: string) => void | Promise<void>;
}) {
  const request = requests[0];
  if (!request) return null;
  return (
    <WorkspaceEnvRequestForm
      key={request.id}
      request={request}
      queuedCount={Math.max(0, requests.length - 1)}
      onSubmit={onSubmit}
      onContinueWithout={onContinueWithout}
    />
  );
}

function WorkspaceEnvRequestForm({
  request,
  queuedCount,
  onSubmit,
  onContinueWithout,
}: {
  request: PendingWorkspaceEnvRequest;
  queuedCount: number;
  onSubmit: (input: SubmitWorkspaceEnvInput) => void | Promise<void>;
  onContinueWithout: (requestId: string) => void | Promise<void>;
}) {
  const [rows, setRows] = useState<EnvRow[]>(() => initialRows(request));
  const [saving, setSaving] = useState(false);
  const [skipping, setSkipping] = useState(false);
  const busy = saving || skipping;
  const [error, setError] = useState<string | null>(null);
  const canSubmit = useMemo(
    () => rows.some((row) => row.name.trim() && row.value.trim()),
    [rows],
  );
  const atRowLimit = rows.length >= MAX_ENV_ROWS;

  const updateRow = (index: number, patch: Partial<EnvRow>) => {
    setRows((current) =>
      current.map((row, candidate) =>
        candidate === index ? { ...row, ...patch } : row,
      ),
    );
  };

  const removeRow = (index: number) => {
    setRows((current) => current.filter((_, candidate) => candidate !== index));
  };

  const addRow = () => {
    setRows((current) => {
      if (current.length >= MAX_ENV_ROWS) return current;
      return [
        ...current,
        {
          name: "",
          value: "",
          secret: true,
          required: false,
          envFile: ".env.local",
        },
      ];
    });
  };

  const submit = async () => {
    const values = rows
      .map((row) => ({
        ...row,
        name: row.name.trim(),
        value: row.value,
      }))
      .filter((row) => row.name && row.value.trim());

    if (values.length === 0) {
      setError("Add at least one value.");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await onSubmit({
        requestId: request.id,
        appPath: request.appPath,
        values: values.map(({ required: _required, ...value }) => value),
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSaving(false);
    }
  };

  const continueWithout = async () => {
    setSkipping(true);
    setError(null);
    try {
      await onContinueWithout(request.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
      setSkipping(false);
    }
  };

  return (
    <div className="absolute right-0 bottom-full left-0 z-30 mb-2 rounded-lg border border-sky-500/50 bg-background/95 p-2 text-xs shadow-xl backdrop-blur">
      <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <span className="font-medium text-sky-100">Add env keys</span>
        <span className="min-w-0 text-[11px] text-muted-foreground leading-snug">
          {SCOPE_HELP}
        </span>
        {queuedCount > 0 && (
          <span className="ml-auto shrink-0 rounded-full border border-sky-500/40 px-1.5 py-0.5 text-[11px] text-sky-100">
            +{queuedCount} queued
          </span>
        )}
      </div>

      <div className="mt-2 space-y-1">
        {rows.map((row, index) => (
          <div
            key={`${row.name || "custom"}-${index}`}
            className="grid grid-cols-[minmax(0,1fr)_minmax(0,1fr)_4.5rem_1.75rem] items-center gap-1.5 rounded border border-border/60 bg-muted/25 px-1.5 py-1"
          >
            <input
              value={row.name}
              onChange={(event) =>
                updateRow(index, { name: event.target.value })
              }
              placeholder="KEY"
              title={row.description ?? undefined}
              className="h-7 min-w-0 rounded border border-border bg-background px-1.5 font-medium text-[11px] outline-none focus:border-sky-400"
              aria-label="Environment variable name"
            />
            <input
              value={row.value}
              onChange={(event) =>
                updateRow(index, { value: event.target.value })
              }
              placeholder={row.secret ? "Secret" : "Value"}
              type={row.secret ? "password" : "text"}
              title={
                row.description ? `${row.name}: ${row.description}` : undefined
              }
              className="h-7 min-w-0 rounded border border-border bg-background px-1.5 text-[11px] outline-none focus:border-sky-400"
              aria-label={`Value for ${row.name || "environment variable"}`}
            />
            <select
              value={row.envFile}
              onChange={(event) =>
                updateRow(index, {
                  envFile: event.target.value as WorkspaceEnvFile,
                })
              }
              className="h-7 rounded border border-border bg-background px-1 text-[10px] outline-none focus:border-sky-400"
              aria-label="Environment file"
            >
              <option value=".env.local">.env.local</option>
              <option value=".env">.env</option>
            </select>
            <button
              type="button"
              className="flex size-7 items-center justify-center rounded border border-border text-muted-foreground hover:bg-background disabled:cursor-not-allowed disabled:opacity-40"
              onClick={() => removeRow(index)}
              disabled={row.required || busy}
              aria-label="Remove environment row"
              title={row.required ? "Required by recipe" : "Remove"}
            >
              <Trash2Icon className="size-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-1 rounded border border-border px-2 py-1 font-medium text-[11px] text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-40"
          onClick={addRow}
          disabled={atRowLimit || busy}
        >
          <PlusIcon className="size-3" />
          Add key
        </button>
        <div className="flex flex-wrap items-center justify-end gap-1.5">
          {error && <span className="text-[11px] text-red-300">{error}</span>}
          <button
            type="button"
            className="rounded border border-border px-2.5 py-1 font-medium text-[11px] text-foreground hover:bg-muted disabled:cursor-not-allowed disabled:opacity-50"
            onClick={continueWithout}
            disabled={busy}
          >
            {skipping ? "Skipping…" : "Continue without"}
          </button>
          <button
            type="button"
            className="rounded bg-sky-400 px-2.5 py-1 font-medium text-[11px] text-black disabled:cursor-not-allowed disabled:opacity-50"
            onClick={submit}
            disabled={!canSubmit || busy}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}

function initialRows(request: PendingWorkspaceEnvRequest): EnvRow[] {
  const fromRequest = request.requested.slice(0, MAX_ENV_ROWS).map(
    (item): EnvRow => ({
      name: item.name,
      value: "",
      required: item.required,
      secret: item.secret,
      envFile: item.envFile,
      ...(item.description ? { description: item.description } : {}),
    }),
  );
  if (fromRequest.length > 0) return fromRequest;
  return [
    {
      name: "",
      value: "",
      required: false,
      secret: true,
      envFile: ".env.local",
    },
  ];
}
