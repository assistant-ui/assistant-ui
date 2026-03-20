"use client";

import type { FC } from "react";

type OpenCodeDataPartProps = {
  name: string;
  data: unknown;
};

const getFiles = (data: unknown) => {
  if (
    typeof data !== "object" ||
    data === null ||
    !("files" in data) ||
    !Array.isArray(data.files)
  ) {
    return [];
  }

  return data.files.filter((file): file is string => typeof file === "string");
};

const getSummary = (name: string, data: unknown) => {
  if (name === "opencode-patch") {
    const files = getFiles(data);
    if (files.length === 0) return "Patch";
    if (files.length === 1) return `Patched ${files[0]}`;
    return `Patched ${files.length} files`;
  }

  if (name === "opencode-step-start") return "Step started";
  if (name === "opencode-step-finish") return "Step finished";
  if (name === "opencode-snapshot") return "Snapshot";
  if (name === "opencode-retry") return "Retry";
  if (name === "opencode-compaction") return "Compaction";
  if (name === "opencode-agent") return "Agent event";
  if (name === "opencode-subtask") return "Subtask";

  return name.replace(/^opencode-/, "").replace(/-/g, " ");
};

export const OpenCodeDataPart: FC<OpenCodeDataPartProps> = ({ name, data }) => {
  if (name === "opencode-step-start" || name === "opencode-step-finish") {
    return null;
  }

  const summary = getSummary(name, data);

  return (
    <div className="my-2 rounded-xl border bg-muted/50 px-3 py-2 text-muted-foreground text-sm">
      {summary}
    </div>
  );
};
