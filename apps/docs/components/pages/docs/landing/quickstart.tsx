"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyCommandButton } from "@/components/shared/copy-command-button";
import { useSurfaceOrDefault } from "@/components/pages/docs/platform/context";
import {
  PLATFORM_ENTRY_PATHS,
  PLATFORM_QUICKSTART_COMMANDS,
} from "@/lib/docs-platform";

export function Quickstart() {
  const platform = useSurfaceOrDefault();

  return (
    <div className="not-prose flex flex-wrap items-center gap-x-4 gap-y-2">
      <CopyCommandButton
        command={PLATFORM_QUICKSTART_COMMANDS[platform]}
        withPromptOption
      />
      <Link
        href={PLATFORM_ENTRY_PATHS[platform]}
        className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-sm transition-colors"
      >
        Add to an existing app
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
