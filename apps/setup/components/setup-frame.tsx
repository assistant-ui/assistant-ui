import type { ReactNode } from "react";
import { DOCS_URL } from "@/lib/config";

/** The column every setup page sits in. */
export const pageColumnClassName =
  "mx-auto w-full max-w-2xl min-w-0 px-4 pt-10 pb-10 sm:px-6 sm:pt-16";

export const pageTitleClassName = "text-2xl font-medium text-balance";

const LOGOTYPE =
  "bg-foreground block h-[18px] w-[108px] [mask-image:url(/brand/logotype.svg)] [mask-size:contain] [mask-position:left_center] [mask-repeat:no-repeat]";

/** The page around a setup: the assistant-ui mark on top, the setup below it. */
export function SetupFrame({ children }: { children: ReactNode }) {
  return (
    <div className="flex h-dvh flex-col">
      <header className="border-foreground/10 flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6">
        <a
          href={DOCS_URL}
          className="focus-visible:ring-ring rounded-sm focus-visible:ring-2 focus-visible:outline-none"
        >
          <span aria-hidden="true" className={LOGOTYPE} />
          <span className="sr-only">assistant-ui</span>
        </a>
        <span aria-hidden="true" className="bg-foreground/15 h-4 w-px" />
        <span className="text-muted-foreground text-sm">Setup</span>
      </header>
      <main
        id="main-content"
        className="flex min-h-0 flex-1 flex-col overflow-y-auto"
      >
        {children}
      </main>
    </div>
  );
}
