"use client";

import type { ReactNode } from "react";
import {
  AlertCircleIcon,
  CheckIcon,
  LoaderIcon,
  XCircleIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type ToolCallStatusLike =
  | {
      type: string;
      reason?: string;
    }
  | undefined;

export const truncate = (value: string, max = 80): string =>
  value.length > max ? `${value.slice(0, max - 3)}...` : value;

export const str = (value: unknown): string =>
  typeof value === "string" ? value : "";

export const basename = (filepath: string): string => {
  const parts = filepath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? filepath;
};

const unique = <T,>(items: readonly T[]) => [...new Set(items)];

export const getPatchInfo = (patchText: string) => {
  if (!patchText) return { files: [] as string[], added: 0, removed: 0 };

  const files = unique(
    [...patchText.matchAll(/^\*\*\*\s+(?:Update|Add|Delete)\s+File:\s+(.+)$/gm)]
      .map((match) => basename(match[1]!.trim()))
      .filter(Boolean),
  );

  let added = 0;
  let removed = 0;
  for (const line of patchText.split("\n")) {
    if (line.startsWith("+")) added += 1;
    else if (line.startsWith("-")) removed += 1;
  }

  return { files, added, removed };
};

export const isCancelledToolStatus = (status?: ToolCallStatusLike) =>
  status?.type === "incomplete" && status.reason === "cancelled";

export const ToolStatusIcon = ({
  status,
  completeIcon,
}: {
  status?: ToolCallStatusLike;
  completeIcon?: ReactNode;
}) => {
  const statusType = status?.type ?? "complete";
  const isCancelled = isCancelledToolStatus(status);

  if (statusType === "running") {
    return <LoaderIcon className="size-3 shrink-0 animate-spin" />;
  }

  if (statusType === "requires-action") {
    return <AlertCircleIcon className="size-3 shrink-0 text-amber-600" />;
  }

  if (statusType === "incomplete") {
    return (
      <XCircleIcon
        className={cn("size-3 shrink-0", !isCancelled && "text-destructive")}
      />
    );
  }

  return completeIcon ?? <CheckIcon className="size-3 shrink-0" />;
};
