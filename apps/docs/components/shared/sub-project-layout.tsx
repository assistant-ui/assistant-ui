"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/github";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { SUB_PROJECTS } from "@/lib/constants";
import { ThemeToggle } from "./theme-toggle";
import { HeaderBrandLink } from "./header-brand-link";
import { headerBarClassName } from "./header-chrome";
import { useScrolled } from "@/hooks/use-scrolled";

interface BreadcrumbItem {
  label: string;
  href: string;
  shimmer?: boolean;
}

interface SubProjectLayoutProps {
  name: string;
  githubPath: string;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
  hideFooter?: boolean;
  fullHeight?: boolean;
}

export function SubProjectLayout({
  name,
  githubPath,
  breadcrumbs: breadcrumbsOverride,
  children,
  hideFooter = false,
  fullHeight = false,
}: SubProjectLayoutProps): React.ReactElement {
  const pathname = usePathname();
  const router = useRouter();
  const scrolled = useScrolled();
  const projects = SUB_PROJECTS.toSorted((a, b) =>
    a.slug.localeCompare(b.slug),
  ).map((project) => {
    const packageStyled = /^[a-z0-9-]+$/.test(project.label);
    const label = packageStyled ? (
      <span
        className={cn(
          "font-mono text-[13px]",
          project.slug === "tw-shimmer" && "shimmer",
        )}
      >
        {project.label}
      </span>
    ) : (
      project.label
    );
    return { value: project.slug, label };
  });

  const breadcrumbs = useMemo(() => {
    if (breadcrumbsOverride) {
      return breadcrumbsOverride;
    }

    const basePath = `/${name}`;
    if (!pathname.startsWith(basePath) || pathname === basePath) {
      return [];
    }

    const subPath = pathname.slice(basePath.length);
    const segments = subPath.split("/").filter(Boolean);

    return segments.map((segment, index) => ({
      label: segment,
      href: `${basePath}/${segments.slice(0, index + 1).join("/")}`,
      shimmer: false,
    }));
  }, [pathname, name, breadcrumbsOverride]);

  return (
    <div
      className={cn(
        "flex flex-col",
        fullHeight ? "h-svh overflow-hidden" : "min-h-screen",
      )}
    >
      <header
        className={cn("z-50 w-full shrink-0", !fullHeight && "sticky top-0")}
      >
        <div
          className={cn(
            "relative flex h-12 w-full items-center justify-between px-4",
            !fullHeight && headerBarClassName(scrolled, "mx-auto max-w-7xl"),
          )}
        >
          <div className="flex min-w-0 items-center">
            <HeaderBrandLink labelClassName="hidden sm:inline" />
            <span className="text-muted-foreground/40 ml-3">/</span>
            <Select
              value={name}
              onValueChange={(value) => {
                if (value !== null) router.push(`/${value}`);
              }}
              items={projects}
            >
              <SelectTrigger className="hover:[&_svg:not([class*='text-'])]:text-foreground h-8 gap-1 border-0 bg-transparent px-2 shadow-none hover:bg-transparent [&_svg]:transition-colors">
                <SelectValue />
              </SelectTrigger>
              <SelectContent align="start">
                {projects.map((project) => (
                  <SelectItem key={project.value} value={project.value}>
                    {project.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="hidden sm:contents">
              {breadcrumbs?.map((item, index) => (
                <span key={item.href} className="contents">
                  <span className="text-muted-foreground/40 mr-3 ml-1">/</span>
                  <Link
                    href={item.href}
                    className={cn(
                      "hover:text-foreground mr-2 text-sm transition-colors",
                      index === breadcrumbs.length - 1
                        ? "text-foreground"
                        : "text-muted-foreground",
                      item.shimmer && "shimmer",
                    )}
                  >
                    {item.label}
                  </Link>
                </span>
              ))}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <div
              data-sub-project-header-portal
              className="flex items-center gap-1"
            />
            <a
              href={githubPath}
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground flex size-8 items-center justify-center transition-colors"
              aria-label="View on GitHub"
            >
              <GitHubIcon className="size-4" />
            </a>
            <ThemeToggle />
          </div>
        </div>
      </header>

      <div className={cn("flex-1", fullHeight && "min-h-0 overflow-hidden")}>
        {children}
      </div>

      {!hideFooter && (
        <footer className="relative px-4 py-8">
          <div className="text-muted-foreground mx-auto flex max-w-7xl items-center justify-between text-sm">
            <p>
              By{" "}
              <Link
                href="/"
                className="hover:text-foreground transition-colors"
              >
                assistant-ui
              </Link>
            </p>
            <a
              href="https://agentbase.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-foreground/30 hover:text-foreground text-xs transition-colors"
            >
              &copy; {new Date().getFullYear()} AgentbaseAI Inc.
            </a>
          </div>
        </footer>
      )}
    </div>
  );
}
