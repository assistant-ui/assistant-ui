"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/github";
import { Select } from "@/components/assistant-ui/select";
import { ThemeToggle } from "./theme-toggle";

const SUB_PROJECTS = [
  {
    value: "playground",
    label: "Playground",
    textValue: "playground",
  },
  {
    value: "mcp-app-studio",
    label: "MCP App Studio",
    textValue: "mcp-app-studio",
  },
  {
    value: "tw-glass",
    label: "tw-glass",
    textValue: "tw-glass",
  },
  {
    value: "tw-shimmer",
    label: <span className="shimmer">tw-shimmer</span>,
    textValue: "tw-shimmer",
  },
  {
    value: "safe-content-frame",
    label: "Safe Content Frame",
    textValue: "safe-content-frame",
  },
] as const;

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
          <div className="mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:mask-[linear-gradient(to_bottom,black_40%,transparent)] pointer-events-none absolute inset-x-0 top-0 h-16 bg-linear-to-b from-background via-60% via-background/80 to-transparent backdrop-blur-xl md:h-24 dark:via-50%" />
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
            <span className="ml-3 text-muted-foreground/40">/</span>
            <Select
              value={name}
              onValueChange={(value) => router.push(`/${value}`)}
              options={SUB_PROJECTS.toSorted((a, b) =>
                a.value.toString().localeCompare(b.value.toString()),
              ).map((p) => ({
                value: p.value,
                label: p.label,
                textValue: p.textValue,
              }))}
            />
            <span className="hidden sm:contents">
              {breadcrumbs?.map((item, index) => (
                <span key={item.href} className="contents">
                  <span className="mr-3 ml-1 text-muted-foreground/40">/</span>
                  <Link
                    href={item.href}
                    className={cn(
                      "mr-2 text-sm transition-colors hover:text-foreground",
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

          <div className="flex items-center gap-1">
            <a
              href={githubPath}
              target="_blank"
              rel="noopener noreferrer"
              className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
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
          <div className="mx-auto flex max-w-7xl items-center justify-between text-muted-foreground text-sm">
            <p>
              By{" "}
              <Link
                href="/"
                className="transition-colors hover:text-foreground"
              >
                assistant-ui
              </Link>
            </p>
            <p className="text-foreground/30 text-xs">
              &copy; {new Date().getFullYear()} AgentbaseAI Inc.
            </p>
          </div>
        </footer>
      )}
    </div>
  );
}
