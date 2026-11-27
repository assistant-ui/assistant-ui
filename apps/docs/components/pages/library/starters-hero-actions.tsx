import Link from "next/link";
import { ArrowRightIcon } from "lucide-react";
import {
  STARTERS,
  starterCommand,
  starterPrompt,
} from "@/lib/library/starters-data";
import {
  LibraryCodeSnippet,
  type LibrarySnippetTab,
} from "./library-code-snippet";

const defaultStarter = STARTERS.find(
  (starter) => starter.kind === "template" && starter.name === "default",
);

const INSTALL_TABS: LibrarySnippetTab[] = defaultStarter
  ? [
      { label: "CLI", code: starterCommand(defaultStarter), kind: "command" },
      {
        label: "Agent prompt",
        code: starterPrompt(defaultStarter),
        kind: "prompt",
      },
    ]
  : [];

export function StartersHeroActions() {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <LibraryCodeSnippet
        tabs={INSTALL_TABS}
        label="Install with"
        className="w-full max-w-md"
      />
      <Link
        href="/docs/cli#create"
        className="group/cta focus-visible:ring-ring bg-foreground/[0.06] hover:bg-foreground/[0.1] inline-flex h-9 items-center gap-2 rounded-full px-4 text-sm font-medium transition-colors outline-none focus-visible:ring-2"
      >
        Read the CLI guide
        <ArrowRightIcon
          aria-hidden
          className="size-4 shrink-0 transition-transform duration-200 group-hover/cta:translate-x-0.5 motion-reduce:transition-none"
        />
      </Link>
    </div>
  );
}
