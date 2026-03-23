"use client";

import { Button } from "@/components/ui/button";
import { useOpenCodePermissions } from "@assistant-ui/react-opencode";
import { ShieldAlertIcon } from "lucide-react";
import { useState } from "react";

export function OpenCodePermissions() {
  const { pending, reply } = useOpenCodePermissions();
  const [submitting, setSubmitting] = useState<string | null>(null);

  const handleReply = async (
    permissionId: string,
    response: "once" | "always" | "reject",
  ) => {
    setSubmitting(permissionId);
    try {
      await reply(permissionId, response);
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Tool approvals</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          Pending OpenCode permission requests remain separate from the message
          timeline.
        </p>
      </div>

      {pending.length === 0 ? (
        <div className="rounded-lg border border-border border-dashed p-4 text-muted-foreground text-sm">
          No pending permission requests.
        </div>
      ) : (
        pending.map((request) => (
          <div key={request.id} className="rounded-lg border bg-card p-4">
            <div className="flex items-start gap-3">
              <div className="rounded-md bg-muted p-2 text-primary">
                <ShieldAlertIcon className="size-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-sm">
                  {request.toolName ?? "Unknown tool"}
                </p>
                <p className="mt-1 text-muted-foreground text-xs">
                  {request.title ?? "OpenCode is requesting approval."}
                </p>
                {request.toolInput !== undefined ? (
                  <pre className="mt-3 overflow-x-auto rounded-md bg-muted p-3 text-xs">
                    {JSON.stringify(request.toolInput, null, 2)}
                  </pre>
                ) : null}
              </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2">
              <Button
                size="sm"
                onClick={() => handleReply(request.id, "once")}
                disabled={submitting === request.id}
              >
                Allow once
              </Button>
              <Button
                size="sm"
                variant="secondary"
                onClick={() => handleReply(request.id, "always")}
                disabled={submitting === request.id}
              >
                Always allow
              </Button>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleReply(request.id, "reject")}
                disabled={submitting === request.id}
              >
                Reject
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
