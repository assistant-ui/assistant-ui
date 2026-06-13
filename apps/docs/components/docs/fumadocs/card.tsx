import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";

type CardProps = {
  title: ReactNode;
  description?: string;
  href?: string;
  children?: ReactNode;
  icon?: ReactNode;
  external?: boolean;
};

const base =
  "flex flex-col gap-1.5 rounded-xl border border-fd-border bg-fd-card p-4";

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
      <span className="flex items-center gap-2 text-sm font-medium">
        {icon}
        <span className="flex-1">{title}</span>
        {href ? (
          external ? (
            <ArrowUpRight className="text-fd-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          ) : (
            <ArrowRight className="text-fd-muted-foreground size-4 shrink-0 transition-transform group-hover:translate-x-0.5" />
          )
        ) : null}
      </span>
      {(description || children) && (
        <span className="text-fd-muted-foreground text-sm">
          {description ?? children}
        </span>
      )}
    </>
  );

  if (href) {
    const className = `group ${base} transition-colors hover:border-fd-foreground/15 hover:bg-fd-muted/50`;
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

  return <div className={base}>{content}</div>;
}

export function Cards({ children }: { children: ReactNode }) {
  return <div className="not-prose grid gap-3 sm:grid-cols-2">{children}</div>;
}

export const CardsLLM = ({ children }: { children: ReactNode }) => (
  <ul>{children}</ul>
);
export const CardLLM = ({ title, description, href, children }: CardProps) => {
  const blurb = description ?? children;
  return (
    <li>
      {href ? <a href={href}>{title}</a> : title}
      {blurb ? <> — {blurb}</> : null}
    </li>
  );
};
