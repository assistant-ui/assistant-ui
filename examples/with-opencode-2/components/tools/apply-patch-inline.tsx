"use client";

import { useMemo } from "react";

type PatchInfo = {
  file: string;
  added: number;
  removed: number;
};

const basename = (filepath: string): string => {
  const parts = filepath.split("/").filter(Boolean);
  return parts[parts.length - 1] ?? filepath;
};

const extractPatchInfo = (argsText: string): PatchInfo => {
  // argsText is JSON-stringified, so newlines may be literal \n or escaped \\n
  const text = argsText.replace(/\\n/g, "\n");

  // Extract filename from diff headers or any file path
  const fileMatch =
    text.match(/^---\s+\w\/(.+)$/m) ??
    text.match(/^---\s+(.+\.\w+)/m) ??
    text.match(/^\+\+\+\s+\w\/(.+)$/m) ??
    text.match(/^\+\+\+\s+(.+\.\w+)/m);
  let file = fileMatch?.[1]?.trim() ?? "";
  if (!file) {
    const pathMatch = text.match(/(?:\/[\w.-]+)+\.\w+/);
    if (pathMatch?.[0]) file = pathMatch[0];
  }
  file = file ? basename(file) : "";

  // Count added/removed lines
  let added = 0;
  let removed = 0;
  const lines = text.split("\n");
  for (const line of lines) {
    if (/^\+[^+]/.test(line)) added++;
    else if (/^-[^-]/.test(line)) removed++;
  }

  return { file, added, removed };
};

export const useApplyPatchInfo = (argsText?: string) => {
  return useMemo(
    () => (argsText ? extractPatchInfo(argsText) : null),
    [argsText],
  );
};

export const ApplyPatchSummary = ({
  patchInfo,
  isRunning,
}: {
  patchInfo: PatchInfo;
  isRunning: boolean;
}) => (
  <>
    {patchInfo.file && (
      <span className="opacity-60">{patchInfo.file}</span>
    )}
    {(patchInfo.added > 0 || patchInfo.removed > 0) && !isRunning && (
      <span className="ml-0.5 flex items-center gap-1 font-mono text-xs">
        {patchInfo.added > 0 && (
          <span className="text-green-500">+{patchInfo.added}</span>
        )}
        {patchInfo.removed > 0 && (
          <span className="text-red-500">-{patchInfo.removed}</span>
        )}
      </span>
    )}
  </>
);
