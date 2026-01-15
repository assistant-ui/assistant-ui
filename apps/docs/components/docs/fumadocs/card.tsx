import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  title: ReactNode;
  description?: string;
  href?: string;
  children?: ReactNode;
};

export function Card({ title, description, href, children }: CardProps) {
  const content = (
    <>
      <span className="font-medium text-sm">{title}</span>
      {(description || children) && (
        <span className="text-muted-foreground text-sm">
          {description ?? children}
        </span>
      )}
    </>
  );

  const className =
    "flex flex-col gap-1 rounded-lg bg-fd-muted/50 p-4 transition-colors hover:bg-fd-muted";

  if (href) {
    return (
      <Link href={href} className={className}>
        {content}
      </Link>
    );
  }

  return <div className={className}>{content}</div>;
}

export function Cards({ children }: { children: ReactNode }) {
  return <div className="not-prose grid gap-3 sm:grid-cols-2">{children}</div>;
}
