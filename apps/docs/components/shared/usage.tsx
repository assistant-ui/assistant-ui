"use client";

import type { ToolCallMessagePartProps } from "@assistant-ui/react";
import type { ReactNode } from "react";
import { TraceLine } from "@/components/shared/trace-line";

type UsageResult = {
  conversationsUsedToday: number;
  conversationsAllowedPerDay: number;
  conversationsRemaining: number;
  resetsAt: string;
  signedIn: boolean;
};

export type UsageToolUIProps = Pick<
  ToolCallMessagePartProps<Record<string, never>, UsageResult>,
  "result" | "status"
>;

export function UsageToolUI({ result, status }: UsageToolUIProps): ReactNode {
  if (status?.type === "running") {
    return <TraceLine live label="checking" detail="today's usage" />;
  }

  if (!result) return null;

  return (
    <TraceLine
      live={false}
      label="checked"
      detail={`${result.conversationsUsedToday} of ${result.conversationsAllowedPerDay} conversations today`}
    />
  );
}
