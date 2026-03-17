import Link from "next/link";
import type { ReactNode } from "react";

type CardProps = {
  title: ReactNode;
  description?: string;
  href?: string;
  children?: ReactNode;
  icon?: ReactNode;
  external?: boolean;
};

export function Card({
  title,
  description,
  href,
  children,
  icon,
  external,
}: CardProps) {
  const content = (
    <>
      <span className="flex items-center gap-2 font-medium text-sm">
        {icon}
        {title}
      </span>
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
    if (external) {
      return (
        <a
          href={href}
          className={className}
          target="_blank"
          rel="noopener noreferrer"
        >
          {content}
        </a>
      );
    }
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
