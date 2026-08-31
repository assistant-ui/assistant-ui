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
    <div className="docs-layout">
      <main className="mx-auto w-full max-w-(--docs-article-width) justify-self-center px-4 pt-4 pb-10 md:px-6">
        {children}
      </main>
      {toc}
    </div>
  );
}

export function DocsBody({ className, ...props }: ComponentProps<"article">) {
  return <article {...props} className={cn("docs-prose prose", className)} />;
}
