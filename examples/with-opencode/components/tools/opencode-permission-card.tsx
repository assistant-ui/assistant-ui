"use client";

import { useState } from "react";
import {
  type OpenCodePermissionRequest,
  type OpenCodePermissionResponse,
  useOpenCodeRuntimeExtras,
} from "@assistant-ui/react-opencode";
import {
  CheckCircle2Icon,
  LoaderIcon,
  ShieldAlertIcon,
  XCircleIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const formatPermissionReply = (reply: OpenCodePermissionResponse) => {
  switch (reply) {
    case "always":
      return "Always allow";
    case "once":
      return "Allowed once";
    case "reject":
      return "Rejected";
  }
};

export const OpenCodePermissionCard = ({
  request,
  state,
  reply,
}: {
  request: OpenCodePermissionRequest;
  state: "pending" | "resolved";
  reply?: OpenCodePermissionResponse;
}) => {
  const { replyToPermission } = useOpenCodeRuntimeExtras();
  const [submittingReply, setSubmittingReply] =
    useState<OpenCodePermissionResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  const submitReply = async (nextReply: OpenCodePermissionResponse) => {
    setSubmittingReply(nextReply);
    setError(null);

    try {
      await replyToPermission(request.id, nextReply);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit reply.");
      setSubmittingReply(null);
    }
  };

  const isPending = state === "pending";

  return (
    <Card className="gap-4 py-4">
      <CardHeader className="px-4">
        <div className="flex items-start gap-3">
          <div className="rounded-md bg-amber-500/10 p-2 text-amber-700">
            {isPending ? (
              <ShieldAlertIcon className="size-4" />
            ) : reply === "reject" ? (
              <XCircleIcon className="size-4" />
            ) : (
              <CheckCircle2Icon className="size-4" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <CardTitle className="text-sm">
              {isPending ? "Approval required" : formatPermissionReply(reply!)}
            </CardTitle>
            <CardDescription className="mt-1 text-xs">
              {request.title ??
                `OpenCode requested approval for ${request.toolName ?? request.permission}.`}
            </CardDescription>
          </div>
          <Badge variant={isPending ? "secondary" : "outline"}>
            {request.toolName ?? request.permission}
          </Badge>
        </div>
      </CardHeader>

      {(request.patterns.length > 0 || request.toolInput !== undefined) && (
        <CardContent className="space-y-3 px-4">
          {request.patterns.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {request.patterns.map((pattern) => (
                <Badge key={pattern} variant="outline" className="font-mono">
                  {pattern}
                </Badge>
              ))}
            </div>
          ) : null}
          {request.toolInput !== undefined ? (
            <pre className="overflow-x-auto rounded-md bg-muted p-3 text-xs">
              {JSON.stringify(request.toolInput, null, 2)}
            </pre>
          ) : null}
        </CardContent>
      )}

      {isPending ? (
        <CardFooter className="flex flex-wrap gap-2 px-4">
          <Button
            size="sm"
            onClick={() => submitReply("once")}
            disabled={submittingReply !== null}
          >
            {submittingReply === "once" && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            Allow once
          </Button>
          <Button
            size="sm"
            variant="secondary"
            onClick={() => submitReply("always")}
            disabled={submittingReply !== null}
          >
            {submittingReply === "always" && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            Always allow
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={() => submitReply("reject")}
            disabled={submittingReply !== null}
          >
            {submittingReply === "reject" && (
              <LoaderIcon className="size-4 animate-spin" />
            )}
            Reject
          </Button>
          {error ? (
            <p className="w-full text-destructive text-xs">{error}</p>
          ) : null}
        </CardFooter>
      ) : null}
    </Card>
  );
};
