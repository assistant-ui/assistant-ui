import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { CopyCommandButton } from "@/components/home/copy-command-button";

export function Quickstart() {
  return (
    <div className="not-prose flex flex-wrap items-center gap-x-4 gap-y-2">
      <CopyCommandButton
        command="npx assistant-ui@latest create"
        withPromptOption
      />
      <Link
        href="/docs/installation"
        className="text-muted-foreground hover:text-foreground group inline-flex items-center gap-1 text-sm transition-colors"
      >
        Add to an existing app
        <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5" />
      </Link>
    </div>
  );
}
