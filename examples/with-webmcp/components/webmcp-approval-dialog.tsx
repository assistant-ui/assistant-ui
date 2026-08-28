"use client";

import { useState } from "react";
import {
  useWebMcpApprovals,
  type WebMcpPendingApproval,
} from "@assistant-ui/react-webmcp";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function WebMcpApprovalDialog() {
  const approvals = useWebMcpApprovals();
  const approval = approvals[0];

  if (!approval) return null;
  return <ApprovalPrompt key={approval.id} approval={approval} />;
}

function ApprovalPrompt({ approval }: { approval: WebMcpPendingApproval }) {
  const [reason, setReason] = useState("");

  const respond = (optionId: string, withReason?: boolean) => {
    approval.respond({
      optionId,
      ...(withReason && reason.trim() ? { reason: reason.trim() } : {}),
    });
  };

  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) respond("reject-once", true);
      }}
    >
      <DialogContent showCloseButton={false}>
        <DialogHeader>
          <DialogTitle>Allow tool call?</DialogTitle>
          <DialogDescription>
            An agent outside this page wants to run{" "}
            <span className="text-foreground font-mono font-medium">
              {approval.toolName}
            </span>
            .
          </DialogDescription>
        </DialogHeader>
        <pre className="bg-muted max-h-48 overflow-auto rounded-lg p-3 font-mono text-xs">
          {JSON.stringify(approval.args, null, 2)}
        </pre>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="webmcp-deny-reason">
            Reason (optional, sent on deny)
          </Label>
          <Input
            id="webmcp-deny-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Why is this call denied?"
          />
        </div>
        <DialogFooter>
          <Button
            variant="destructive"
            onClick={() => respond("reject-once", true)}
          >
            Deny
          </Button>
          <Button variant="outline" onClick={() => respond("allow-always")}>
            Always allow
          </Button>
          <Button onClick={() => respond("allow-once")}>Allow once</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
