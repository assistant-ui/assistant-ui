"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/github";
import { Select } from "@/components/assistant-ui/select";
import { SUB_PROJECTS } from "@/lib/constants";
import { ThemeToggle } from "./theme-toggle";

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
        {!fullHeight && (
          <div className="from-background pointer-events-none absolute inset-x-0 top-0 h-14 bg-linear-to-b to-transparent mask-[linear-gradient(to_bottom,black_75%,transparent)] backdrop-blur-xl" />
        )}
        <div
          className={cn(
            "relative flex h-12 w-full items-center justify-between px-4",
            !fullHeight && "mx-auto max-w-7xl",
          )}
        >
          <div className="flex min-w-0 items-center">
            <Link href="/" className="flex shrink-0 items-center gap-2">
              <Image
                src="/favicon/icon.svg"
                alt="assistant-ui logo"
                width={18}
                height={18}
                className="dark:hue-rotate-180 dark:invert"
              />
              <span className="hidden font-medium tracking-tight sm:inline">
                assistant-ui
              </span>
            </Link>
            <span className="text-muted-foreground/40 ml-3">/</span>
            <Select
              value={name}
              onValueChange={(value) => router.push(`/${value}`)}
              options={SUB_PROJECTS.toSorted((a, b) =>
                a.slug.localeCompare(b.slug),
              ).map((p) => ({
                value: p.slug,
                label:
                  p.slug === "tw-shimmer" ? (
                    <span className="shimmer">{p.label}</span>
                  ) : (
                    p.label
                  ),
                textValue: p.slug,
              }))}
            />
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

      <main className={cn("flex-1", fullHeight && "min-h-0 overflow-hidden")}>
        {children}
      </main>

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
