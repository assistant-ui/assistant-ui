import { useMemo } from 'react';
import type { ServerEvent } from '@/components/agent-playground/augment/types';
import { toolStepLabel } from '@/components/agent-playground/lib/toolStepLabels';
import { InitialMessageSender } from '../chat/InitialMessageSender';

interface Step {
  id: string;
  toolName: string;
  label: string;
  done: boolean;
}

function stepsFromEventLog(events: ServerEvent[]): Step[] {
  const steps: Step[] = [];
  const seen = new Map<string, Step>();

  for (const event of events) {
    const payload = event.payload as Record<string, unknown> | null;
    const toolName = typeof payload?.toolName === 'string' ? payload.toolName : null;
    const toolCallId = typeof payload?.toolCallId === 'string' ? payload.toolCallId : null;
    if (!toolName || !toolCallId) continue;

    if (event.type === 'tool_start') {
      const step: Step = { id: toolCallId, toolName, label: toolStepLabel(toolName), done: false };
      seen.set(toolCallId, step);
      steps.push(step);
    } else if (event.type === 'tool_end') {
      const step = seen.get(toolCallId);
      if (step) step.done = true;
    }
  }

  return steps;
}

interface Props {
  prompt: string;
  eventLog: ServerEvent[];
  isRunning: boolean;
  initialPrompt: string | null;
  onInitialMessageSent?: (() => void) | undefined;
}

export function BuildingView({ prompt, eventLog, isRunning, initialPrompt, onInitialMessageSent }: Props) {
  const steps = useMemo(() => stepsFromEventLog(eventLog), [eventLog]);

  return (
    <div className="flex h-full flex-col items-center justify-center px-6">
      <InitialMessageSender initialPrompt={initialPrompt} onSent={onInitialMessageSent} />

      <div className="w-full max-w-xl space-y-4">
        {/* User prompt bubble */}
        <div className="flex justify-end">
          <div className="max-w-sm rounded-2xl bg-primary px-4 py-2.5 text-sm text-primary-foreground">
            {prompt}
          </div>
        </div>

        {/* Agent steps or thinking indicator */}
        <ul className="space-y-2 pl-1">
          {steps.length === 0 && isRunning && (
            <li className="flex items-center gap-2 text-sm">
              <span className="size-1.5 rounded-full shrink-0 bg-primary animate-pulse" />
              <span className="text-muted-foreground">Thinking…</span>
            </li>
          )}
          {steps.map((step, i) => {
            const isLast = i === steps.length - 1;
            const running = isLast && isRunning && !step.done;
            return (
              <li key={step.id} className="flex items-center gap-2 text-sm">
                <span className={`size-1.5 rounded-full shrink-0 ${running ? 'bg-primary animate-pulse' : 'bg-muted-foreground/40'}`} />
                <span className={running ? 'text-foreground' : 'text-muted-foreground'}>
                  {step.label}
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}
