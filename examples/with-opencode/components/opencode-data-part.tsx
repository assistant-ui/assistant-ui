"use client";

import { WrenchIcon } from "lucide-react";
import type { FC } from "react";

type OpenCodeDataPartProps = {
  name: string;
  data: unknown;
};

const getSummary = (name: string, data: unknown) => {
  if (
    name === "opencode-unsupported-part" &&
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof data.type === "string"
  ) {
    return `Unsupported part: ${data.type}`;
  }

  if (name === "opencode-snapshot") return "Snapshot";
  if (name === "opencode-retry") return "Retry";
  if (name === "opencode-compaction") return "Compaction";
  if (name === "opencode-agent") return "Agent event";
  if (name === "opencode-subtask") return "Subtask";

  return name.replace(/^opencode-/, "").replace(/-/g, " ");
};

export const OpenCodeDataPart: FC<OpenCodeDataPartProps> = ({ name, data }) => {
  const shouldHide =
    name === "opencode-step-start" ||
    name === "opencode-step-finish" ||
    name === "opencode-patch";

  if (shouldHide) {
    return null;
  }

  const summary = getSummary(name, data);

  return (
    <div className="my-3 flex w-min items-center gap-2 text-nowrap rounded-full border bg-muted/30 px-2 py-1 text-muted-foreground text-xs">
      <WrenchIcon className="size-3" />
      {summary}
    </div>
  );
};
