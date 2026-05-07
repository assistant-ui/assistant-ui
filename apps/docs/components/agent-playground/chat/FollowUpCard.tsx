import { CornerDownRightIcon } from 'lucide-react';
import type { PendingFollowUp } from '@/components/agent-playground/runtime/assistantTypes';

export function FollowUpCard({
  followUps,
}: {
  followUps: PendingFollowUp[];
}) {
  if (followUps.length === 0) return null;

  return (
    <div className="absolute bottom-full left-0 right-0 z-10 mb-2 max-h-52 space-y-2 overflow-y-auto">
      {followUps.map((followUp, index) => (
        <div key={followUp.id} className="rounded-lg border border-border bg-background/95 p-3 text-sm shadow-xl backdrop-blur">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="font-medium text-foreground">
                {index === 0 ? 'Queued follow-up' : 'Queued next'}
              </div>
              <div className="mt-1 flex min-w-0 items-start gap-2 text-muted-foreground">
                <CornerDownRightIcon className="mt-0.5 size-4 shrink-0" />
                <div className="min-w-0">
                  <div className="font-medium text-foreground/90">{followUp.title}</div>
                  <div className="mt-0.5 line-clamp-2 break-words text-xs">{followUp.content}</div>
                </div>
              </div>
            </div>
            {followUps.length > 1 && index === 0 ? (
              <div className="rounded-full border border-border px-2 py-1 text-xs text-muted-foreground">
                +{followUps.length - 1}
              </div>
            ) : null}
          </div>
        </div>
      ))}
    </div>
  );
}
