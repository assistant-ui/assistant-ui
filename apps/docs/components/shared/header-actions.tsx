import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/github";
import { CartButton } from "./shop-entry";
import { ThemeToggle } from "./theme-toggle";

interface HeaderActionsProps {
  githubHref: string;
  githubLabel: string;
  /** Display classes for the GitHub link. */
  githubClassName?: string;
  /** Rendered before the cart. */
  children?: ReactNode;
  /** Rendered after the theme toggle, for controls the page owns. */
  actions?: ReactNode;
}

export function HeaderActions({
  githubHref,
  githubLabel,
  githubClassName = "flex",
  children,
  actions,
}: HeaderActionsProps): React.ReactElement {
  return (
    <div className="flex items-center gap-1 sm:gap-2">
      {children}
      <CartButton />
      <a
        href={githubHref}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "text-muted-foreground hover:text-foreground size-8 items-center justify-center transition-colors",
          githubClassName,
        )}
        aria-label={githubLabel}
      >
        <GitHubIcon className="size-4" />
      </a>
      <ThemeToggle />
      {actions}
    </div>
  );
}
