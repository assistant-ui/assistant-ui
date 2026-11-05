import type { ComponentProps, ReactNode } from "react";
import { Link } from "fumadocs-core/framework";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { cn } from "../site/utils";

export function Steps({ className, ...props }: ComponentProps<"div">) {
  return <div {...props} className={cn("aui-docs-steps", className)} />;
}

export function Step({ className, children, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("aui-docs-step", className)}>
      <div className="aui-docs-step-marker" aria-hidden="true">
        <div className="aui-docs-step-number" />
        <div className="aui-docs-step-line" />
      </div>
      <div className="aui-docs-step-content">{children}</div>
    </div>
  );
}

export interface CardProps {
  title: ReactNode;
  description?: string;
  href?: string;
  icon?: ReactNode;
  external?: boolean;
  children?: ReactNode;
}

export function Card({
  title,
  description,
  href,
  icon,
  external,
  children,
}: CardProps) {
  const content = (
    <>
      <span className="aui-docs-card-title">
        {icon}
        <span className="aui-docs-card-title-text">{title}</span>
        {href &&
          (external ? (
            <ArrowUpRight className="aui-docs-card-arrow" data-external="" />
          ) : (
            <ArrowRight className="aui-docs-card-arrow" />
          ))}
      </span>
      {(description || children) && (
        <span className="aui-docs-card-description">
          {description ?? children}
        </span>
      )}
    </>
  );

  if (!href) return <div className="aui-docs-card">{content}</div>;
  if (external) {
    return (
      <a
        href={href}
        className="aui-docs-card"
        target="_blank"
        rel="noopener noreferrer"
      >
        {content}
      </a>
    );
  }
  return (
    <Link href={href} className="aui-docs-card">
      {content}
    </Link>
  );
}

export function Cards({ className, ...props }: ComponentProps<"div">) {
  return (
    <div {...props} className={cn("aui-docs-cards not-prose", className)} />
  );
}

export function Table({ className, ...props }: ComponentProps<"table">) {
  return (
    <div className="aui-docs-table not-prose">
      <table {...props} className={className} />
    </div>
  );
}

export function Kbd({ className, ...props }: ComponentProps<"kbd">) {
  return <kbd {...props} className={cn("aui-docs-kbd", className)} />;
}

export function Code({ className, ...props }: ComponentProps<"code">) {
  return <code {...props} className={cn("aui-docs-code", className)} />;
}

export function ThemeImage({
  light,
  dark,
  alt = "",
  className,
  ...props
}: Omit<ComponentProps<"img">, "src"> & { light: string; dark: string }) {
  return (
    <>
      <img
        {...props}
        src={light}
        alt={alt}
        loading="lazy"
        className={cn("aui-docs-theme-image", className)}
        data-theme="light"
      />
      <img
        {...props}
        src={dark}
        alt={alt}
        loading="lazy"
        className={cn("aui-docs-theme-image", className)}
        data-theme="dark"
      />
    </>
  );
}
