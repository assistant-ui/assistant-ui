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

  // A deployment without a budget reports no limit rather than a spent one, and
  // a count against a limit of zero would read as though everything were used.
  const detail =
    result.conversationsAllowedPerDay > 0
      ? `${result.conversationsUsedToday} of ${result.conversationsAllowedPerDay} conversations today`
      : "usage is not limited here";

  return <TraceLine live={false} label="checked" detail={detail} />;
}
