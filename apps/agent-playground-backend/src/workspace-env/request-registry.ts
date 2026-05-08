import { randomBytes, randomUUID } from 'node:crypto';
import type { Harness } from '@mastra/core/harness';
import { RequestContext } from '@mastra/core/request-context';
import type { EventBroker } from '../events/EventBroker.js';
import type { ServerEvent } from '../events/types.js';
import type { HarnessState } from '../schema.js';
import type { AgentSession } from '../sessions/types.js';
import { sessionWorkspaceRegistry } from '../workspace-provider.js';
import {
  resolveWorkspaceAppPath,
  updateWorkspaceEnv,
  type WorkspaceEnvExpectedVar,
  type WorkspaceEnvFile,
  type WorkspaceEnvStatus,
  type WorkspaceEnvValue,
} from './file-store.js';

export interface WorkspaceEnvRequestItem extends WorkspaceEnvExpectedVar {
  envFile: WorkspaceEnvFile;
}

export interface WorkspaceEnvRequest {
  requestId: string;
  sessionId: string;
  appPath: string;
  reason: string;
  required: WorkspaceEnvRequestItem[];
  optional: WorkspaceEnvRequestItem[];
  expected: WorkspaceEnvExpectedVar[];
  createdAt: string;
}

export interface WorkspaceEnvRuntime {
  harness: Harness<HarnessState>;
  session: AgentSession;
  eventBroker: EventBroker;
}

export interface SubmitWorkspaceEnvInput {
  requestId: string;
  appPath?: string;
  values: WorkspaceEnvValue[];
}

const runtimes = new Map<string, WorkspaceEnvRuntime>();
const requestsBySession = new Map<string, Map<string, WorkspaceEnvRequest>>();

export function registerWorkspaceEnvRuntime(sessionId: string, runtime: WorkspaceEnvRuntime): void {
  runtimes.set(sessionId, runtime);
}

export function unregisterWorkspaceEnvRuntime(sessionId: string): void {
  runtimes.delete(sessionId);
  requestsBySession.delete(sessionId);
}

export function getWorkspaceEnvRuntime(sessionId: string): WorkspaceEnvRuntime | null {
  return runtimes.get(sessionId) ?? null;
}

export function createWorkspaceEnvRequest(options: {
  sessionId: string;
  appPath: string;
  reason: string;
  required: WorkspaceEnvExpectedVar[];
  optional: WorkspaceEnvExpectedVar[];
}): WorkspaceEnvRequest {
  const runtime = getWorkspaceEnvRuntime(options.sessionId);
  if (!runtime) throw new Error('Workspace env runtime is not registered for this session.');

  const required = withDefaultEnvFile(options.required);
  const optional = withDefaultEnvFile(options.optional.map((item) => ({ ...item, required: false })));
  const request: WorkspaceEnvRequest = {
    requestId: randomUUID(),
    sessionId: options.sessionId,
    appPath: options.appPath,
    reason: options.reason,
    required,
    optional,
    expected: [...required, ...optional],
    createdAt: new Date().toISOString(),
  };

  const sessionRequests = requestsBySession.get(options.sessionId) ?? new Map<string, WorkspaceEnvRequest>();
  sessionRequests.set(request.requestId, request);
  requestsBySession.set(options.sessionId, sessionRequests);

  emitWorkspaceEnvEvent(runtime, 'workspace_env_request_created', {
    requestId: request.requestId,
    appPath: request.appPath,
    reason: request.reason,
    requested: [
      ...request.required.map((item) => eventItem(item, true)),
      ...request.optional.map((item) => eventItem(item, false)),
    ],
  });

  return request;
}

export async function skipWorkspaceEnvRequest(
  sessionId: string,
  input: { requestId: string },
): Promise<{ accepted: true }> {
  const runtime = getWorkspaceEnvRuntime(sessionId);
  if (!runtime) throw new Error('Workspace env runtime is not registered for this session.');

  const sessionRequests = requestsBySession.get(sessionId);
  const request = sessionRequests?.get(input.requestId);
  if (!request) {
    return { accepted: true };
  }

  sessionRequests?.delete(input.requestId);
  const { appPath } = request;

  emitWorkspaceEnvEvent(runtime, 'workspace_env_skipped', {
    requestId: input.requestId,
    appPath,
  });

  return { accepted: true };
}

export async function submitWorkspaceEnv(
  sessionId: string,
  input: SubmitWorkspaceEnvInput,
): Promise<{
  accepted: true;
  requestId: string;
  appPath: string;
  keysAdded: string[];
  keysUpdated: string[];
  status: WorkspaceEnvStatus;
}> {
  const runtime = getWorkspaceEnvRuntime(sessionId);
  if (!runtime) throw new Error('Workspace env runtime is not registered for this session.');

  const request = requestsBySession.get(sessionId)?.get(input.requestId);
  const provisioned = sessionWorkspaceRegistry.get(sessionId);
  if (!provisioned) throw new Error('No workspace is provisioned for this session. Call request_workspace first.');

  const appPath = resolveWorkspaceAppPath(provisioned, input.appPath ?? request?.appPath ?? '');
  const expected = request?.expected ?? valuesAsExpected(input.values);
  const result = await updateWorkspaceEnv({
    workspace: provisioned.workspace,
    appPath,
    values: input.values,
    expected,
  });
  const missingRequired = result.status.vars
    .filter((item) => item.required && !item.hasValue)
    .map((item) => item.name);

  if (request) requestsBySession.get(sessionId)?.delete(input.requestId);

  emitWorkspaceEnvEvent(runtime, 'workspace_env_updated', {
    requestId: input.requestId,
    appPath,
    keysAdded: result.keysAdded,
    keysUpdated: result.keysUpdated,
    missingRequired,
    status: result.status,
  });

  const notice = buildAgentNotice({
    appPath,
    keysAdded: result.keysAdded,
    keysUpdated: result.keysUpdated,
    missingRequired,
  });
  await notifyAgent(runtime, notice);

  return {
    accepted: true,
    requestId: input.requestId,
    appPath,
    keysAdded: result.keysAdded,
    keysUpdated: result.keysUpdated,
    status: result.status,
  };
}

function withDefaultEnvFile(items: WorkspaceEnvExpectedVar[]): WorkspaceEnvRequestItem[] {
  return items.map((item) => ({ ...item, envFile: item.envFile ?? '.env.local' }));
}

function eventItem(item: WorkspaceEnvRequestItem, fallbackRequired: boolean) {
  return {
    name: item.name,
    required: item.required ?? fallbackRequired,
    secret: item.secret,
    envFile: item.envFile,
    ...(item.description ? { description: item.description } : {}),
  };
}

function valuesAsExpected(values: WorkspaceEnvValue[]): WorkspaceEnvExpectedVar[] {
  return values.map((value) => ({
    name: value.name,
    required: false,
    secret: value.secret,
    envFile: value.envFile,
    ...(value.description ? { description: value.description } : {}),
  }));
}

function emitWorkspaceEnvEvent(runtime: WorkspaceEnvRuntime, type: string, payload: Record<string, unknown>): void {
  const event: ServerEvent = {
    id: randomUUID(),
    sessionId: runtime.session.id,
    threadId: runtime.harness.getCurrentThreadId(),
    type,
    payload,
    createdAt: new Date().toISOString(),
  };
  runtime.eventBroker.emit(event);
}

function buildAgentNotice(input: {
  appPath: string;
  keysAdded: string[];
  keysUpdated: string[];
  missingRequired: string[];
}): string {
  const configured = [...new Set([...input.keysAdded, ...input.keysUpdated])].sort();
  const configuredText = configured.length ? configured.join(', ') : 'none';
  const missingText = input.missingRequired.length
    ? ` Missing required keys still not configured: ${input.missingRequired.join(', ')}.`
    : '';
  return [
    'Workspace environment was updated.',
    `App path: ${input.appPath}.`,
    `Configured keys: ${configuredText}.`,
    `${missingText}`,
    'If a running server or process depends on these values, restart the relevant process before verification.',
  ].join(' ').replace(/\s+/g, ' ').trim();
}

async function notifyAgent(runtime: WorkspaceEnvRuntime, content: string): Promise<void> {
  const requestContext = new RequestContext();
  const traceId = randomBytes(16).toString('hex');
  requestContext.set('augmentTrace', {
    traceId,
    sessionId: runtime.session.id,
    threadId: runtime.harness.getCurrentThreadId(),
  });

  if (runtime.session.status === 'running' || runtime.harness.isRunning()) {
    emitWorkspaceEnvEvent(runtime, 'agent_follow_up_queued', {
      id: traceId,
      title: 'Workspace env updated',
      content,
      source: 'workspace_env_updated',
    });
    await runtime.harness.followUp({ content, requestContext });
    return;
  }

  runtime.session.status = 'running';
  runtime.session.updatedAt = new Date().toISOString();
  runtime.harness
    .sendMessage({
      content,
      requestContext,
      tracingOptions: {
        traceId,
        metadata: {
          sessionId: runtime.session.id,
          threadId: runtime.harness.getCurrentThreadId(),
          source: 'workspace-env-updated',
        },
        tags: [`session:${runtime.session.id}`, 'workspace-env-updated'],
      },
    })
    .finally(() => {
      runtime.session.status = 'idle';
      runtime.session.updatedAt = new Date().toISOString();
    })
    .catch(() => {
      runtime.session.status = 'idle';
      runtime.session.updatedAt = new Date().toISOString();
    });
}
