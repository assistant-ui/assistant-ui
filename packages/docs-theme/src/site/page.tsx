import type { ComponentProps, ReactNode } from "react";
import { cn } from "./utils";

export function DocsPageShell({
  toc,
  footer,
  children,
}: {
  toc?: ReactNode;
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="docs-layout">
      <main className="mx-auto w-full max-w-(--docs-article-width) justify-self-center px-4 pt-4 pb-10 md:px-6">
        {children}
      </main>
      {toc}
      {footer && (
        <footer className="mx-auto w-full max-w-(--docs-article-width) justify-self-center px-4 pb-10 md:px-6">
          <div className="border-t pt-6">{footer}</div>
        </footer>
      )}
    </div>
  );
}

export function DocsBody({ className, ...props }: ComponentProps<"article">) {
  return <article {...props} className={cn("docs-prose prose", className)} />;
}
