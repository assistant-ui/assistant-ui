"use client";

import { Button } from "@/components/ui/button";
import {
  useOpenCodePermissions,
  useOpenCodeQuestions,
} from "@assistant-ui/react-opencode";
import { ShieldAlertIcon } from "lucide-react";
import { useState } from "react";

const omitKey = <T extends Record<string, unknown>>(record: T, key: string) => {
  if (!(key in record)) return record;

  const nextRecord = { ...record };
  delete nextRecord[key];
  return nextRecord;
};

export function OpenCodePermissions() {
  const { pending, reply } = useOpenCodePermissions();
  const questions = useOpenCodeQuestions();
  const [submittingById, setSubmittingById] = useState<
    Record<string, boolean>
  >({});
  const [errorById, setErrorById] = useState<Record<string, string>>({});

  const handleReply = async (
    permissionId: string,
    response: "once" | "always" | "reject",
  ) => {
    setSubmittingById((current) => ({ ...current, [permissionId]: true }));
    setErrorById((current) => omitKey(current, permissionId));

    try {
      await reply(permissionId, response);
      setErrorById((current) => omitKey(current, permissionId));
    } catch (error) {
      setErrorById((current) => ({
        ...current,
        [permissionId]:
          error instanceof Error ? error.message : "Failed to send reply.",
      }));
    } finally {
      setSubmittingById((current) => omitKey(current, permissionId));
    }
  };

  return (
    <div className="space-y-4">
      <div>
        <h2 className="font-semibold text-lg">Human input</h2>
        <p className="mt-1 text-muted-foreground text-sm">
          OpenCode approvals and interactive questions remain separate from the
          message timeline so missing support stays visible.
        </p>
      </div>

      <section className="space-y-3">
        <div>
          <h3 className="font-medium text-sm">Tool approvals</h3>
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
                    {request.toolName ?? request.permission}
                  </p>
                  <p className="mt-1 text-muted-foreground text-xs">
                    {request.title ??
                      `OpenCode is requesting ${request.permission}.`}
                  </p>
                  {request.patterns.length > 0 ? (
                    <p className="mt-2 text-muted-foreground text-xs">
                      Patterns: {request.patterns.join(", ")}
                    </p>
                  ) : null}
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
                  disabled={Boolean(submittingById[request.id])}
                >
                  Allow once
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => handleReply(request.id, "always")}
                  disabled={Boolean(submittingById[request.id])}
                >
                  Always allow
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => handleReply(request.id, "reject")}
                  disabled={Boolean(submittingById[request.id])}
                >
                  Reject
                </Button>
              </div>
              {errorById[request.id] ? (
                <p className="mt-2 text-destructive text-xs">
                  {errorById[request.id]}
                </p>
              ) : null}
            </div>
          ))
        )}
      </section>

      <section className="space-y-3">
        <div>
          <h3 className="font-medium text-sm">Questions</h3>
          <p className="mt-1 text-muted-foreground text-xs">
            Read-only for now; this keeps unsupported interaction flows visible.
          </p>
        </div>
        {questions.length === 0 ? (
          <div className="rounded-lg border border-border border-dashed p-4 text-muted-foreground text-sm">
            No pending questions.
          </div>
        ) : (
          questions.map((request) => (
            <div key={request.id} className="rounded-lg border bg-card p-4">
              <div className="space-y-3">
                {request.questions.map((question, index) => (
                  <div key={`${request.id}-${index}`} className="space-y-1">
                    <p className="font-medium text-sm">
                      {question.header || `Question ${index + 1}`}
                    </p>
                    {question.question ? (
                      <p className="text-muted-foreground text-xs">
                        {question.question}
                      </p>
                    ) : null}
                    {Array.isArray(question.options) &&
                    question.options.length > 0 ? (
                      <ul className="list-disc pl-4 text-muted-foreground text-xs">
                        {question.options.map((option) => (
                          <li key={option.label}>{option.label}</li>
                        ))}
                      </ul>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </section>
    </div>
  );
}
