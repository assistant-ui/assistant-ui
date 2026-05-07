import type { ServerEvent } from '@/components/agent-playground/augment/types';
import type { AssistantThreadMessageLike, AssistantToolPart } from '@/components/agent-playground/runtime/assistantTypes';
import type { PreviewTarget } from '../types';

type ToolPayload = {
  toolName?: string | undefined;
  result?: unknown | undefined;
  isError?: boolean | undefined;
};

type ExamplePreviewResult = {
  type: 'show_ui_preview';
  recipeId: string;
  status: 'ready' | 'missing';
  previewUrl?: string | undefined;
  reason: string;
};

type WorkspacePreviewResult = {
  type: 'workspace_preview';
  status: 'ready' | 'loading' | 'failed';
  source: 'local' | 'sandbox';
  url?: string | undefined;
  port: number;
  host?: string | undefined;
  provider?: 'blaxel' | undefined;
  error?: string | undefined;
  downloadUrl?: string | undefined;
};

function asToolPayload(payload: unknown): ToolPayload {
  if (!payload || typeof payload !== 'object') return {};
  return payload as ToolPayload;
}

function isExamplePreviewResult(value: unknown): value is ExamplePreviewResult {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return record.type === 'show_ui_preview' && (record.status === 'ready' || record.status === 'missing');
}

function isWorkspacePreviewResult(value: unknown): value is WorkspacePreviewResult {
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  return (
    record.type === 'workspace_preview' &&
    (record.status === 'ready' || record.status === 'loading' || record.status === 'failed') &&
    (record.source === 'local' || record.source === 'sandbox')
  );
}

function previewFromExampleResult(result: ExamplePreviewResult): PreviewTarget {
  if (result.status === 'ready' && result.previewUrl) {
    return {
      status: 'ready',
      source: 'hosted',
      label: `${result.recipeId} preview`,
      url: result.previewUrl,
      hint: result.reason,
    };
  }

  return {
    status: 'empty',
    source: 'none',
    label: `${result.recipeId} preview`,
    hint: result.reason || 'No hosted preview is currently available.',
  };
}

function previewFromWorkspaceResult(result: WorkspacePreviewResult): PreviewTarget {
  if (result.status === 'ready' && result.url) {
    return {
      status: 'ready',
      source: result.source,
      label: result.source === 'sandbox' ? 'Sandbox preview' : 'Local preview',
      url: result.url,
      hint: result.source === 'sandbox' ? 'Live preview from the sandbox workspace.' : 'Live preview from the local workspace.',
      downloadUrl: result.downloadUrl,
    };
  }

  if (result.status === 'loading') {
    return {
      status: 'loading',
      source: result.source,
      label: result.source === 'sandbox' ? 'Sandbox preview' : 'Local preview',
      hint: 'Resolving the workspace preview URL.',
    };
  }

  return {
    status: 'failed',
    source: result.source,
    label: result.source === 'sandbox' ? 'Sandbox preview' : 'Local preview',
    hint: result.error || 'Preview resolution failed.',
    error: result.error || 'Preview resolution failed.',
  };
}

function loadingPreviewTarget(toolName?: string): PreviewTarget {
  if (toolName === 'resolve_workspace_preview') {
    return {
      status: 'loading',
      source: 'none',
      label: 'Preview',
      hint: 'Preparing the workspace preview.',
    };
  }

  return {
    status: 'loading',
    source: 'none',
    label: 'Preview',
    hint: 'Loading the hosted example preview.',
  };
}

function failedPreviewTarget(toolName?: string): PreviewTarget | null {
  if (toolName === 'resolve_workspace_preview') {
    return {
      status: 'failed',
      source: 'none',
      label: 'Preview',
      hint: 'Preview resolution failed.',
      error: 'Preview resolution failed.',
    };
  }

  return null;
}

function previewTargetFromToolPayload(payload: ToolPayload): PreviewTarget | null {
  if (payload.isError) return failedPreviewTarget(payload.toolName);

  if (isExamplePreviewResult(payload.result)) {
    return previewFromExampleResult(payload.result);
  }

  if (isWorkspacePreviewResult(payload.result)) {
    return previewFromWorkspaceResult(payload.result);
  }

  return null;
}

function previewTargetFromToolPart(part: AssistantToolPart, current: PreviewTarget | null): PreviewTarget | null {
  if (part.toolName !== 'show_ui_preview' && part.toolName !== 'resolve_workspace_preview') return null;
  if (part.result !== undefined || part.isError) {
    return previewTargetFromToolPayload({
      toolName: part.toolName,
      result: part.result,
      isError: part.isError,
    });
  }

  if (part.status?.type === 'running') {
    return current?.status === 'ready' && current.url ? current : loadingPreviewTarget(part.toolName);
  }

  return null;
}

export function previewTargetFromEvent(event: ServerEvent, current: PreviewTarget | null = null): PreviewTarget | null {
  const payload = asToolPayload(event.payload);

  if (event.type === 'tool_start') {
    if (payload.toolName === 'resolve_workspace_preview' || payload.toolName === 'show_ui_preview') {
      return current?.status === 'ready' && current.url ? current : loadingPreviewTarget(payload.toolName);
    }

    return null;
  }

  if (event.type !== 'tool_end') return null;
  return previewTargetFromToolPayload(payload);
}

export function latestPreviewTargetFromEvents(events: ServerEvent[], initialTarget: PreviewTarget | null = null): PreviewTarget | null {
  let current = initialTarget;
  for (const event of events) {
    const target = previewTargetFromEvent(event, current);
    if (target) current = target;
  }
  return current;
}

export function latestPreviewTargetFromMessages(messages: AssistantThreadMessageLike[]): PreviewTarget | null {
  let current: PreviewTarget | null = null;

  for (const message of messages) {
    for (const part of message.content) {
      if (part.type !== 'tool-call') continue;
      const target = previewTargetFromToolPart(part, current);
      if (target) current = target;
    }
  }

  return current;
}
