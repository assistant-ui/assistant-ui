import { Streamdown } from 'streamdown';
import { code } from '@streamdown/code';

export type ToolPayloadChannel =
  | 'args'
  | 'argsText'
  | 'result'
  | 'artifact'
  | 'subagentText'
  | 'subagentToolResult';

export type ToolPayloadRendererKind = 'json' | 'streamdown' | 'text' | 'empty';

export type ToolPayloadRenderContext = {
  toolName: string;
  channel: ToolPayloadChannel;
  value: unknown;
  isError?: boolean | undefined;
};

const streamdownPlugins = { code };

export function selectToolPayloadRenderer({
  channel,
  value,
  isError,
}: ToolPayloadRenderContext): ToolPayloadRendererKind {
  if (value == null || value === '') return 'empty';
  if (isError) return 'text';
  if (typeof value !== 'string') return 'json';
  if (channel === 'argsText') return looksLikeJson(value) ? 'json' : 'text';
  if (channel === 'subagentText') return 'streamdown';
  if (looksLikeShellOutput(value)) return 'text';
  if (looksLikeJson(value)) return 'json';
  return 'streamdown';
}

export function ToolPayloadRenderer({
  context,
  emptyLabel = 'No data',
}: {
  context: ToolPayloadRenderContext;
  emptyLabel?: string | undefined;
}) {
  const kind = selectToolPayloadRenderer(context);

  if (kind === 'empty') return <div className="text-sm text-muted-foreground">{emptyLabel}</div>;

  if (kind === 'streamdown') {
    return (
      <div className="text-sm leading-6 text-foreground">
        <Streamdown plugins={streamdownPlugins}>{String(context.value)}</Streamdown>
      </div>
    );
  }

  const text = kind === 'json' ? stringifyJsonLike(context.value) : String(context.value);
  const tone = context.isError ? 'text-destructive' : 'text-foreground/90';

  return (
    <pre className={`scrollbar-thin max-h-72 overflow-auto whitespace-pre-wrap rounded-md bg-muted/40 p-3 text-xs ${tone}`}>
      {text}
    </pre>
  );
}

function looksLikeJson(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) return false;
  if (!['{', '['].includes(trimmed[0]!)) return false;
  try {
    JSON.parse(trimmed);
    return true;
  } catch {
    return false;
  }
}

function looksLikeShellOutput(value: string): boolean {
  if (value.includes('\r\n')) return true;
  if (value.includes('\n') && /(^|\n)(\$|>|PS |error:|npm |pnpm |yarn |[A-Z]:\\)/i.test(value)) return true;
  return value.length > 500 && value.includes('\n');
}

function stringifyJsonLike(value: unknown): string {
  if (typeof value === 'string') {
    try {
      return JSON.stringify(JSON.parse(value), null, 2);
    } catch {
      return value;
    }
  }
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return String(value);
  }
}
