import { makeAssistantToolUI, type ToolCallMessagePartProps } from '@assistant-ui/react';
import { Bot, CheckCircle2, ChevronDownIcon, FileEdit, FileQuestion, FileText, FolderSearch, KeyRound, Loader2, Plus, Search, Terminal, Trash2, XCircle } from 'lucide-react';
import { useState } from 'react';
import { useToolActions } from '@/components/agent-playground/runtime/ToolActionContext';
import { normalizeToolName } from '@/components/agent-playground/runtime/toolMapping';
import type { WorkspaceEnvFile, WorkspaceEnvValueInput } from '@/components/agent-playground/augment/types';
import { getToolVisualStatus, ToolShell } from './ToolShell';
import { ToolDiff } from './ToolDiff';
import { ToolFallback } from '../tool-fallback';
import { ToolPayloadRenderer } from './ToolPayloadRenderer';
import { TaskCheckToolView, TaskWriteToolView } from './TaskToolCard';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/agent-playground/ui/collapsible';
import { useAutoOpenWhileBusy } from '@/components/agent-playground/lib/useAutoOpenWhileBusy';
import { cn } from '@/lib/utils';

function PayloadSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <div className="mb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</div>
      {children}
    </section>
  );
}

function makeGenericToolUI(toolName: string) {
  return makeAssistantToolUI<Record<string, unknown>, unknown>({
    toolName,
    render: ToolFallback,
  });
}

export const ShellToolUI = makeAssistantToolUI<{ command?: string }, unknown>({
  toolName: 'shell',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`$ ${args.command ?? 'shell'}`}
      icon={<Terminal className="h-4 w-4" />}
      tone="shell"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      <ToolPayloadRenderer context={{ toolName: 'shell', channel: 'result', value: result }} />
    </ToolShell>
  ),
});

export const RunCommandToolUI = makeAssistantToolUI<{ command?: string }, unknown>({
  toolName: 'run_command',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`$ ${args.command ?? 'run command'}`}
      icon={<Terminal className="h-4 w-4" />}
      tone="shell"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      <ToolPayloadRenderer context={{ toolName: 'run_command', channel: 'result', value: result }} />
    </ToolShell>
  ),
});

export const WriteFileToolUI = makeAssistantToolUI<{ path?: string; file_path?: string; content?: string }, unknown>({
  toolName: 'write_file',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`Write: ${args.path ?? args.file_path ?? 'file'}`}
      icon={<FileText className="h-4 w-4" />}
      tone="file"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      <ToolDiff filePath={args.path ?? args.file_path} newContent={args.content} />
      <ToolPayloadRenderer context={{ toolName: 'write_file', channel: 'result', value: result }} emptyLabel="" />
    </ToolShell>
  ),
});

export const EditFileToolUI = makeAssistantToolUI<{ path?: string; file_path?: string; old_string?: string; new_string?: string }, unknown>({
  toolName: 'edit_file',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`Edit: ${args.path ?? args.file_path ?? 'file'}`}
      icon={<FileEdit className="h-4 w-4" />}
      tone="file"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      <ToolDiff filePath={args.path ?? args.file_path} oldContent={args.old_string} newContent={args.new_string} />
      <ToolPayloadRenderer context={{ toolName: 'edit_file', channel: 'result', value: result }} emptyLabel="" />
    </ToolShell>
  ),
});

export const ReadFileToolUI = makeAssistantToolUI<{ path?: string; file_path?: string }, unknown>({
  toolName: 'read_file',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`Read: ${args.path ?? args.file_path ?? 'file'}`}
      icon={<FileText className="h-4 w-4" />}
      tone="file"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      <ToolPayloadRenderer context={{ toolName: 'read_file', channel: 'result', value: result }} />
    </ToolShell>
  ),
});

export const SearchToolUI = makeAssistantToolUI<{ pattern?: string; query?: string; path?: string }, unknown>({
  toolName: 'grep',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`Search: ${args.pattern ?? args.query ?? ''}`}
      icon={<Search className="h-4 w-4" />}
      tone="search"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      {args.path ? <div className="mb-2 text-xs text-muted-foreground">{args.path}</div> : null}
      <ToolPayloadRenderer context={{ toolName: 'grep', channel: 'result', value: result }} />
    </ToolShell>
  ),
});

export const GlobToolUI = makeAssistantToolUI<{ pattern?: string; path?: string }, unknown>({
  toolName: 'glob',
  render: ({ args, result, status }) => (
    <ToolShell
      title={`Glob: ${args.pattern ?? ''}`}
      icon={<FolderSearch className="h-4 w-4" />}
      tone="search"
      status={getToolVisualStatus(status.type, false, result !== undefined)}
    >
      {args.path ? <div className="mb-2 text-xs text-muted-foreground">{args.path}</div> : null}
      <ToolPayloadRenderer context={{ toolName: 'glob', channel: 'result', value: result }} />
    </ToolShell>
  ),
});

type AskUserArgs = {
  question?: string | undefined;
  options?: Array<{ label?: string; description?: string; value?: string } | string>;
  questionId?: string | undefined;
};

type AskUserResult = {
  answer?: string | undefined;
  response?: string | undefined;
  selected?: string | undefined;
};

export const AskUserToolUI = makeAssistantToolUI<AskUserArgs, AskUserResult | string>({
  toolName: 'ask_user',
  render: ({ args, result, status, toolCallId }) => {
    const { respondToQuestion } = useToolActions();
    const [freeformAnswer, setFreeformAnswer] = useState('');
    const [submitted, setSubmitted] = useState(false);
    const questionId = args.questionId ?? toolCallId;
    const options = normalizeQuestionOptions(args.options);
    const resultAnswer = typeof result === 'string' ? result : result?.answer ?? result?.response ?? result?.selected;
    const waiting = status.type === 'requires-action' || (status.type === 'running' && !resultAnswer);

    const submitAnswer = async (answer: string) => {
      const trimmed = answer.trim();
      if (!questionId || !trimmed || submitted) return;
      setSubmitted(true);
      try {
        await respondToQuestion(questionId, trimmed);
      } catch {
        setSubmitted(false);
      }
    };

    return (
      <ToolShell
        title="Question"
        icon={<FileQuestion className="h-4 w-4" />}
        status={getToolVisualStatus(waiting ? 'requires-action' : status.type, false, resultAnswer !== undefined)}
        busy={waiting}
      >
        <div className="space-y-3">
          <div className="text-sm font-medium text-foreground">{args.question ?? 'The agent needs your input.'}</div>
          {waiting ? (
            <div className="space-y-3">
              {options.length > 0 ? (
                <div className="grid gap-2">
                  {options.map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      disabled={submitted}
                      onClick={() => void submitAnswer(option.value)}
                      className="rounded-lg border bg-background/70 px-3 py-2 text-left text-sm text-foreground transition-colors hover:border-ring disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      <div className="font-medium">{option.label}</div>
                      {option.description ? <div className="mt-1 text-xs text-muted-foreground">{option.description}</div> : null}
                    </button>
                  ))}
                </div>
              ) : null}
              <div className="flex gap-2">
                <input
                  value={freeformAnswer}
                  onChange={(event) => setFreeformAnswer(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') void submitAnswer(freeformAnswer);
                  }}
                  placeholder={options.length > 0 ? 'Or type another answer...' : 'Type your answer...'}
                  className="min-w-0 flex-1 rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring"
                />
                <button
                  type="button"
                  disabled={submitted || !freeformAnswer.trim()}
                  onClick={() => void submitAnswer(freeformAnswer)}
                  className="rounded-md bg-primary px-3 py-2 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Send
                </button>
              </div>
            </div>
          ) : (
            <PayloadSection title="Answer">
              <ToolPayloadRenderer context={{ toolName: 'ask_user', channel: 'result', value: resultAnswer ?? result }} />
            </PayloadSection>
          )}
        </div>
      </ToolShell>
    );
  },
});

function normalizeQuestionOptions(options: AskUserArgs['options']) {
  if (!Array.isArray(options)) return [];
  return options.map((option, index) => {
    if (typeof option === 'string') return { label: option, value: option, description: undefined };
    const label = String(option.label ?? option.value ?? `Option ${index + 1}`);
    return {
      label,
      value: String(option.value ?? option.label ?? label),
      description: typeof option.description === 'string' ? option.description : undefined,
    };
  });
}

type WorkspaceEnvRequestItem = {
  name?: string | undefined;
  required?: boolean | undefined;
  secret?: boolean | undefined;
  description?: string | undefined;
  envFile?: WorkspaceEnvFile | undefined;
};

type WorkspaceEnvArgs = {
  appPath?: string | undefined;
  reason?: string | undefined;
  required?: WorkspaceEnvRequestItem[] | undefined;
  optional?: WorkspaceEnvRequestItem[] | undefined;
};

type WorkspaceEnvResult = {
  status?: string | undefined;
  keysAdded?: string[] | undefined;
  keysUpdated?: string[] | undefined;
  missingRequired?: string[] | undefined;
};

type EnvFormRow = WorkspaceEnvValueInput & {
  required: boolean;
};

export const WorkspaceEnvToolUI = makeAssistantToolUI<WorkspaceEnvArgs, WorkspaceEnvResult>({
  toolName: 'request_workspace_env',
  render: ({ args, result, status, artifact }) => {
    const { respondToToolSuspension } = useToolActions();
    const effectiveArgs = workspaceEnvArgsFromArtifact(artifact, args);
    const [rows, setRows] = useState<EnvFormRow[]>(() => initialEnvRows(effectiveArgs));
    const [submitted, setSubmitted] = useState(false);
    const waiting = status.type === 'requires-action' || (status.type === 'running' && !result);
    const hasAnyValue = rows.some((row) => row.name.trim() && row.value.length > 0);
    const hasMissingRequired = rows.some((row) => row.required && (!row.name.trim() || row.value.length === 0));
    const canSubmit = hasAnyValue && !hasMissingRequired;

    const setRow = (index: number, patch: Partial<EnvFormRow>) => {
      setRows((current) => current.map((row, rowIndex) => (rowIndex === index ? { ...row, ...patch } : row)));
    };
    const removeRow = (index: number) => {
      setRows((current) => current.filter((_, rowIndex) => rowIndex !== index));
    };
    const addRow = () => {
      setRows((current) => [
        ...current,
        { name: '', value: '', secret: true, envFile: '.env.local', required: false },
      ]);
    };
    const submit = async () => {
      if (submitted || !canSubmit) return;
      setSubmitted(true);
      const values = rows
        .map((row) => workspaceEnvValueFromRow(row))
        .filter((row) => row.name && row.value.length > 0);
      try {
        await respondToToolSuspension({ values });
      } catch {
        setSubmitted(false);
      }
    };

    return (
      <ToolShell
        title="Environment"
        icon={<KeyRound className="h-4 w-4" />}
        tone="task"
        status={getToolVisualStatus(waiting ? 'requires-action' : status.type, false, result !== undefined)}
        busy={waiting}
      >
        {waiting ? (
          <div className="space-y-3">
            <div className="space-y-1">
              <div className="text-sm font-medium text-foreground">{effectiveArgs.reason ?? 'The app needs environment values.'}</div>
              {effectiveArgs.appPath ? <div className="text-xs text-muted-foreground">{effectiveArgs.appPath}</div> : null}
            </div>
            <div className="space-y-2">
              {rows.map((row, index) => (
                <div key={`${row.name}-${index}`} className="grid gap-2 rounded-md border bg-background/60 p-2 md:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)_8rem_2rem]">
                  <div className="min-w-0">
                    <input
                      value={row.name}
                      onChange={(event) => setRow(index, { name: event.target.value })}
                      placeholder="KEY_NAME"
                      disabled={submitted || Boolean(row.description)}
                      className="w-full rounded-md border bg-background px-2 py-1.5 text-xs font-medium text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring disabled:opacity-80"
                    />
                    {row.description ? <div className="mt-1 text-[11px] text-muted-foreground">{row.description}</div> : null}
                  </div>
                  <input
                    value={row.value}
                    onChange={(event) => setRow(index, { value: event.target.value })}
                    placeholder={row.secret ? 'Secret value' : 'Value'}
                    disabled={submitted}
                    type={row.secret ? 'password' : 'text'}
                    className="min-w-0 rounded-md border bg-background px-2 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground/70 focus:border-ring disabled:opacity-60"
                  />
                  <select
                    value={row.envFile}
                    onChange={(event) => setRow(index, { envFile: event.target.value as WorkspaceEnvFile })}
                    disabled={submitted}
                    className="rounded-md border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus:border-ring disabled:opacity-60"
                  >
                    <option value=".env.local">.env.local</option>
                    <option value=".env">.env</option>
                  </select>
                  <button
                    type="button"
                    onClick={() => removeRow(index)}
                    disabled={submitted || row.required}
                    className="flex h-8 w-8 items-center justify-center rounded-md border text-muted-foreground hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Remove environment key"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <button
                type="button"
                onClick={addRow}
                disabled={submitted}
                className="inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 text-xs font-medium text-foreground hover:bg-muted/60 disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Plus className="h-3.5 w-3.5" /> Add key
              </button>
              <button
                type="button"
                onClick={() => void submit()}
                disabled={submitted || !canSubmit}
                className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground disabled:cursor-not-allowed disabled:opacity-50"
              >
                Save keys
              </button>
            </div>
          </div>
        ) : (
          <WorkspaceEnvResultView result={result} />
        )}
      </ToolShell>
    );
  },
});

function initialEnvRows(args: WorkspaceEnvArgs): EnvFormRow[] {
  const required = normalizeEnvItems(args.required, true);
  const optional = normalizeEnvItems(args.optional, false);
  const rows = [...required, ...optional];
  return rows.length > 0 ? rows : [{ name: '', value: '', secret: true, envFile: '.env.local', required: false }];
}

function workspaceEnvArgsFromArtifact(artifact: unknown, fallback: WorkspaceEnvArgs): WorkspaceEnvArgs {
  const record = artifact && typeof artifact === 'object' ? artifact as Record<string, unknown> : {};
  const suspendPayload = record.suspendPayload && typeof record.suspendPayload === 'object'
    ? record.suspendPayload as WorkspaceEnvArgs
    : null;
  return suspendPayload ? { ...fallback, ...suspendPayload } : fallback;
}

function normalizeEnvItems(items: WorkspaceEnvRequestItem[] | undefined, fallbackRequired: boolean): EnvFormRow[] {
  if (!Array.isArray(items)) return [];
  return items
    .filter((item) => typeof item.name === 'string' && item.name.trim().length > 0)
    .map((item) => {
      const row: EnvFormRow = {
        name: item.name!.trim(),
        value: '',
        secret: item.secret ?? true,
        envFile: item.envFile ?? '.env.local',
        required: item.required ?? fallbackRequired,
      };
      if (item.description) row.description = item.description;
      return row;
    });
}

function workspaceEnvValueFromRow(row: EnvFormRow): WorkspaceEnvValueInput {
  const value: WorkspaceEnvValueInput = {
    name: row.name.trim(),
    value: row.value,
    secret: row.secret,
    envFile: row.envFile,
  };
  if (row.description) value.description = row.description;
  return value;
}

function WorkspaceEnvResultView({ result }: { result?: WorkspaceEnvResult | undefined }) {
  const keysAdded = result?.keysAdded ?? [];
  const keysUpdated = result?.keysUpdated ?? [];
  const missingRequired = result?.missingRequired ?? [];
  if (result?.status === 'already_configured') {
    return <div className="text-sm text-muted-foreground">Environment keys are already present.</div>;
  }
  return (
    <div className="space-y-2 text-sm">
      <div className="text-muted-foreground">Environment files updated. Values are hidden.</div>
      {keysAdded.length > 0 ? <div className="text-xs text-muted-foreground">Added: {keysAdded.join(', ')}</div> : null}
      {keysUpdated.length > 0 ? <div className="text-xs text-muted-foreground">Updated: {keysUpdated.join(', ')}</div> : null}
      {missingRequired.length > 0 ? <div className="text-xs text-amber-500">Still missing: {missingRequired.join(', ')}</div> : null}
    </div>
  );
}

type NestedSubagentTool = {
  toolCallId?: string | undefined;
  toolName?: string | undefined;
  args?: unknown | undefined;
  result?: unknown | undefined;
  isError?: boolean | undefined;
  status?: string | undefined;
};

type SubagentArgs = {
  subagentName?: string | undefined;
  agentType?: string | undefined;
  modelId?: string | undefined;
  task?: string | undefined;
  subagentText?: string | undefined;
  nestedTools?: NestedSubagentTool[] | undefined;
};

function NestedToolStatusBadge({ status, isError }: { status?: string | undefined; isError?: boolean | undefined }) {
  if (isError) {
    return (
      <span className="flex items-center gap-1 text-xs text-red-400">
        <XCircle className="h-3 w-3" /> error
      </span>
    );
  }
  if (status === 'running') {
    return (
      <span className="flex items-center gap-1 text-xs text-amber-300">
        <Loader2 className="h-3 w-3 animate-spin" /> running
      </span>
    );
  }
  if (status === 'complete') {
    return (
      <span className="flex items-center gap-1 text-xs text-emerald-400">
        <CheckCircle2 className="h-3 w-3" /> done
      </span>
    );
  }
  return null;
}

function NestedToolItem({ tool }: { tool: NestedSubagentTool }) {
  const isRunning = tool.status === 'running';
  const hasResult = tool.result !== undefined;
  const busy = isRunning || (!hasResult && !tool.isError);
  const { open, onOpenChange } = useAutoOpenWhileBusy(busy);
  const toolName = normalizeToolName(tool.toolName ?? 'tool');

  return (
    <Collapsible
      open={open}
      onOpenChange={onOpenChange}
      className="overflow-hidden rounded-md border border-border/60 bg-background/40"
    >
      <CollapsibleTrigger
        className={cn(
          'group/nested-trigger flex w-full items-center gap-2 px-3 py-2 text-left text-xs transition-colors hover:bg-muted/40',
        )}
      >
        <ChevronDownIcon
          className={cn(
            'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
            open ? 'rotate-0' : '-rotate-90',
          )}
        />
        <span className="min-w-0 flex-1 truncate font-medium text-foreground">{toolName}</span>
        <NestedToolStatusBadge status={tool.status} isError={tool.isError} />
      </CollapsibleTrigger>
      <CollapsibleContent
        className={cn(
          'overflow-hidden text-xs outline-none',
          'data-[state=closed]:animate-collapsible-up',
          'data-[state=open]:animate-collapsible-down',
          'data-[state=closed]:fill-mode-forwards',
          'data-[state=closed]:pointer-events-none',
          'data-[state=open]:duration-200',
          'data-[state=closed]:duration-200',
        )}
      >
        <div className="space-y-3 border-t border-border/60 px-3 py-3">
          {tool.args !== undefined ? (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">Input</div>
              <ToolPayloadRenderer context={{ toolName: tool.toolName ?? 'tool', channel: 'args', value: tool.args }} />
            </div>
          ) : null}
          {hasResult || isRunning ? (
            <div>
              <div className="mb-1 text-[11px] uppercase tracking-wide text-muted-foreground">{tool.isError ? 'Error' : 'Output'}</div>
              <ToolPayloadRenderer
                context={{
                  toolName: tool.toolName ?? 'tool',
                  channel: 'subagentToolResult',
                  value: tool.result,
                  isError: tool.isError,
                }}
                emptyLabel={isRunning ? 'Running...' : 'No output'}
              />
            </div>
          ) : null}
        </div>
      </CollapsibleContent>
    </Collapsible>
  );
}

export function SubagentToolView({
  args,
  result,
  isError,
  status,
}: ToolCallMessagePartProps<SubagentArgs, unknown>) {
  const nestedTools = Array.isArray(args.nestedTools) ? args.nestedTools : [];
  const agentName = args.agentType ?? args.subagentName ?? 'subagent';
  const hasResult = result !== undefined;

  return (
    <ToolShell
      title={`Subagent: ${agentName}`}
      icon={<Bot className="h-4 w-4" />}
      tone="task"
      status={getToolVisualStatus(status.type, isError, hasResult)}
      busy={status.type === 'running'}
    >
      <div className="space-y-4">
        {args.task || args.modelId ? (
          <PayloadSection title="Task">
            <div className="space-y-1 text-sm text-foreground/90">
              {args.task ? <div>{args.task}</div> : null}
              {args.modelId ? <div className="text-xs text-muted-foreground">{args.modelId}</div> : null}
            </div>
          </PayloadSection>
        ) : null}

        <PayloadSection title="Subagent Stream">
          <ToolPayloadRenderer
            context={{ toolName: 'subagent', channel: 'subagentText', value: args.subagentText }}
            emptyLabel={status.type === 'running' ? 'Waiting for subagent output...' : 'No streamed output'}
          />
        </PayloadSection>

        {nestedTools.length > 0 ? (
          <PayloadSection title="Nested Tools">
            <div className="space-y-2">
              {nestedTools.map((tool, index) => (
                <NestedToolItem key={tool.toolCallId ?? `${tool.toolName ?? 'tool'}-${index}`} tool={tool} />
              ))}
            </div>
          </PayloadSection>
        ) : null}

        {hasResult ? (
          <PayloadSection title={isError ? 'Error' : 'Result'}>
            <ToolPayloadRenderer context={{ toolName: 'subagent', channel: 'result', value: result, isError }} />
          </PayloadSection>
        ) : null}
      </div>
    </ToolShell>
  );
}

export const SubagentToolUI = makeAssistantToolUI<SubagentArgs, unknown>({
  toolName: 'subagent',
  render: SubagentToolView,
});

export const TaskWriteToolUI = makeAssistantToolUI({
  toolName: 'task_write',
  render: TaskWriteToolView,
});

export const TaskCheckToolUI = makeAssistantToolUI({
  toolName: 'task_check',
  render: TaskCheckToolView,
});

const RequestWorkspaceToolUI = makeGenericToolUI('request_workspace');
const ListWorkspaceEnvStatusToolUI = makeGenericToolUI('list_workspace_env_status');
const ExecuteCommandToolUI = makeGenericToolUI('execute_command');
const BashToolUI = makeGenericToolUI('bash');
const ApplyPatchToolUI = makeGenericToolUI('apply_patch');
const SearchContentToolUI = makeGenericToolUI('search_content');
const FindFilesToolUI = makeGenericToolUI('find_files');

export function ToolUIs() {
  return (
    <>
      <ShellToolUI />
      <RunCommandToolUI />
      <WriteFileToolUI />
      <EditFileToolUI />
      <ReadFileToolUI />
      <SearchToolUI />
      <GlobToolUI />
      <RequestWorkspaceToolUI />
      <ListWorkspaceEnvStatusToolUI />
      <SubagentToolUI />
      <TaskWriteToolUI />
      <TaskCheckToolUI />
      <AskUserToolUI />
      <ExecuteCommandToolUI />
      <BashToolUI />
      <ApplyPatchToolUI />
      <SearchContentToolUI />
      <FindFilesToolUI />
    </>
  );
}
