import { Agent } from '@mastra/core/agent';
import type { HarnessRequestContext, HarnessSubagent } from '@mastra/core/harness';
import { resolveObservabilityContext } from '@mastra/core/observability';
import { RequestContext } from '@mastra/core/request-context';
import { createTool } from '@mastra/core/tools';
import { createWorkspaceTools } from '@mastra/core/workspace';
import { z } from 'zod/v4';

import type { HarnessState } from '../schema.js';

interface CreateTracedSubagentToolOptions {
  subagents: HarnessSubagent[];
  resolveModel: (modelId: string) => any;
  harnessTools?: Record<string, any>;
  fallbackModelId?: string;
}

interface SubagentToolCall {
  name: string;
  toolCallId: string;
  isError?: boolean;
}

export function createTracedSubagentTool({
  subagents,
  resolveModel,
  harnessTools,
  fallbackModelId,
}: CreateTracedSubagentToolOptions) {
  const subagentIds = subagents.map((s) => s.id);
  const typeDescriptions = subagents
    .map((s) => `- **${s.id}** (${s.name}): ${s.description}`)
    .join('\n');

  return createTool({
    id: 'subagent',
    description: `Delegate a focused task to a specialized subagent. The subagent runs independently with a constrained toolset, then returns its findings as text.

Available agent types:
${typeDescriptions}

The subagent runs in its own context - it does NOT see the parent conversation history. Write a clear, self-contained task description.

Use this tool when:
- You want to run multiple investigations in parallel
- The task is self-contained and can be delegated`,
    inputSchema: z.object({
      agentType: z.enum(subagentIds as [string, ...string[]]).describe('Type of subagent to spawn'),
      task: z
        .string()
        .describe('Clear, self-contained description of what the subagent should do. Include all relevant context - the subagent cannot see the parent conversation.'),
      modelId: z.string().optional().describe('Optional model ID override for this task.'),
    }),
    execute: async ({ agentType, task, modelId }, context) => {
      const definition = subagents.find((s) => s.id === agentType);
      if (!definition) {
        return {
          content: `Unknown agent type: ${agentType}. Valid types: ${subagentIds.join(', ')}`,
          isError: true,
        };
      }

      const harnessCtx = context?.requestContext?.get('harness') as
        | HarnessRequestContext<HarnessState>
        | undefined;
      const emitEvent = harnessCtx?.emitEvent;
      const abortSignal = harnessCtx?.abortSignal;
      const toolCallId = context?.agent?.toolCallId ?? 'unknown';

      const mergedTools: Record<string, any> = { ...(definition.tools ?? {}) };
      if (definition.allowedHarnessTools && harnessTools) {
        for (const toolId of definition.allowedHarnessTools) {
          if (harnessTools[toolId] && !mergedTools[toolId]) {
            mergedTools[toolId] = harnessTools[toolId];
          }
        }
      }

      const harnessModelId = harnessCtx?.getSubagentModelId?.({ agentType }) ?? undefined;
      const resolvedModelId = modelId ?? harnessModelId ?? definition.defaultModelId ?? fallbackModelId;
      if (!resolvedModelId) {
        return { content: 'No model ID available for subagent. Configure defaultModelId.', isError: true };
      }

      let model: any;
      try {
        model = resolveModel(resolvedModelId);
      } catch (err) {
        return {
          content: `Failed to resolve model "${resolvedModelId}": ${err instanceof Error ? err.message : String(err)}`,
          isError: true,
        };
      }

      const workspace = context?.workspace;
      const subagent = new Agent({
        id: `subagent-${definition.id}`,
        name: `${definition.name} Subagent`,
        instructions: definition.instructions,
        model,
        tools: mergedTools,
        workspace,
      });

      const allowedWs = definition.allowedWorkspaceTools ? new Set(definition.allowedWorkspaceTools) : undefined;
      const allWorkspaceToolNames =
        workspace && allowedWs
          ? new Set(
              Object.keys(
                await createWorkspaceTools(workspace, {
                  requestContext: context?.requestContext ?? {},
                  workspace,
                }),
              ),
            )
          : undefined;

      const startTime = Date.now();
      emitEvent?.({ type: 'subagent_start', toolCallId, agentType, task, modelId: resolvedModelId });

      let partialText = '';
      const toolCallLog: SubagentToolCall[] = [];
      let subagentRequestContext: RequestContext | undefined;
      if (context?.requestContext) {
        subagentRequestContext = new RequestContext(context.requestContext.entries());
        if (harnessCtx) {
          subagentRequestContext.set('harness', { ...harnessCtx, threadId: null, resourceId: '' });
        }
      }

      try {
        const response = await subagent.stream(task, {
          maxSteps: definition.maxSteps ?? (definition.stopWhen ? undefined : 50),
          stopWhen: definition.stopWhen,
          abortSignal,
          requireToolApproval: false,
          requestContext: subagentRequestContext,
          ...resolveObservabilityContext(context ?? {}),
          prepareStep:
            allowedWs && allWorkspaceToolNames
              ? ({ tools }: { tools?: Record<string, unknown> }) => ({
                  activeTools: Object.keys(tools ?? {}).filter((k) => !allWorkspaceToolNames.has(k) || allowedWs.has(k)),
                })
              : undefined,
        });

        for await (const chunk of response.fullStream) {
          switch (chunk.type) {
            case 'text-delta':
              partialText += chunk.payload.text;
              emitEvent?.({ type: 'subagent_text_delta', toolCallId, agentType, textDelta: chunk.payload.text });
              break;
            case 'tool-call':
              toolCallLog.push({ name: chunk.payload.toolName, toolCallId: chunk.payload.toolCallId });
              emitEvent?.({
                type: 'subagent_tool_start',
                toolCallId,
                agentType,
                subToolName: chunk.payload.toolName,
                subToolArgs: chunk.payload.args,
              });
              break;
            case 'tool-result': {
              const isErr = chunk.payload.isError ?? false;
              for (let i = toolCallLog.length - 1; i >= 0; i--) {
                if (toolCallLog[i]?.toolCallId === chunk.payload.toolCallId && toolCallLog[i]?.isError === undefined) {
                  toolCallLog[i]!.isError = isErr;
                  break;
                }
              }
              emitEvent?.({
                type: 'subagent_tool_end',
                toolCallId,
                agentType,
                subToolName: chunk.payload.toolName,
                subToolResult: chunk.payload.result,
                isError: isErr,
              });
              break;
            }
          }
        }

        if (abortSignal?.aborted) {
          const durationMs = Date.now() - startTime;
          const abortResult = partialText ? `[Aborted by user]\n\nPartial output:\n${partialText}` : '[Aborted by user]';
          emitEvent?.({ type: 'subagent_end', toolCallId, agentType, result: abortResult, isError: false, durationMs });
          return { content: abortResult + buildSubagentMeta(resolvedModelId, durationMs, toolCallLog), isError: false };
        }

        const fullOutput = await response.getFullOutput();
        const resultText = fullOutput.text || partialText;
        const durationMs = Date.now() - startTime;
        emitEvent?.({ type: 'subagent_end', toolCallId, agentType, result: resultText, isError: false, durationMs });
        return { content: resultText + buildSubagentMeta(resolvedModelId, durationMs, toolCallLog), isError: false };
      } catch (err) {
        const isAbort =
          err instanceof Error &&
          (err.name === 'AbortError' || err.message.includes('abort') || err.message.includes('cancel'));
        const durationMs = Date.now() - startTime;
        if (isAbort) {
          const abortResult = partialText ? `[Aborted by user]\n\nPartial output:\n${partialText}` : '[Aborted by user]';
          emitEvent?.({ type: 'subagent_end', toolCallId, agentType, result: abortResult, isError: false, durationMs });
          return { content: abortResult + buildSubagentMeta(resolvedModelId, durationMs, toolCallLog), isError: false };
        }

        const message = err instanceof Error ? err.message : String(err);
        emitEvent?.({ type: 'subagent_end', toolCallId, agentType, result: message, isError: true, durationMs });
        return {
          content: `Subagent "${definition.name}" failed: ${message}` + buildSubagentMeta(resolvedModelId, durationMs, toolCallLog),
          isError: true,
        };
      }
    },
  });
}

function buildSubagentMeta(modelId: string, durationMs: number, toolCalls: SubagentToolCall[]) {
  const tools = toolCalls.map((tc) => `${tc.name}:${tc.isError ? 'err' : 'ok'}`).join(',');
  return `\n<subagent-meta modelId="${modelId}" durationMs="${durationMs}" tools="${tools}" />`;
}
