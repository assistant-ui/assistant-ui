import type { ComponentProps, ReactNode } from "react";
import { cn } from "@/lib/utils";

export function DocsPageShell({
  toc,
  children,
}: {
  toc?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div id="nd-docs-layout">
      <main id="nd-page">{children}</main>
      {toc}
    </div>
  );
}

export function DocsBody({ className, ...props }: ComponentProps<"article">) {
  return <article {...props} className={cn("prose", className)} />;
}
