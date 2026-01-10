"use client";

import { type ReactNode, useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Image from "next/image";
import { Moon, Sun } from "lucide-react";
import { cn } from "@/lib/utils";
import { GitHubIcon } from "@/components/icons/github";
import { Select } from "./select";

const SUB_PROJECTS = [
  {
    value: "chatgpt-app-studio",
    label: "chatgpt-app-studio",
    textValue: "chatgpt-app-studio",
  },
  {
    value: "tw-shimmer",
    label: <span className="shimmer">tw-shimmer</span>,
    textValue: "tw-shimmer",
  },
  {
    value: "safe-content-frame",
    label: "safe-content-frame",
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
  shimmerTitle?: boolean;
  breadcrumbs?: BreadcrumbItem[];
  children: ReactNode;
}

function ThemeToggle() {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const savedTheme = localStorage.getItem("theme") as "light" | "dark" | null;
    if (savedTheme) {
      setTheme(savedTheme);
      document.documentElement.classList.toggle("dark", savedTheme === "dark");
    } else {
      const isDark = document.documentElement.classList.contains("dark");
      setTheme(isDark ? "dark" : "light");
    }
  }, []);

  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    setTheme(newTheme);
    document.documentElement.classList.toggle("dark", newTheme === "dark");
    localStorage.setItem("theme", newTheme);
  };

  if (!mounted) {
    return <div className="size-8" />;
  }

  return (
    <button
      onClick={toggleTheme}
      className="flex size-8 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
      aria-label="Toggle theme"
    >
      {theme === "light" ? (
        <Moon className="size-4" />
      ) : (
        <Sun className="size-4" />
      )}
    </button>
  );
}

export function SubProjectLayout({
  name,
  githubPath,
  shimmerTitle,
  breadcrumbs: breadcrumbsOverride,
  children,
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
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-50 w-full">
        <div className="mask-[linear-gradient(to_bottom,black_50%,transparent)] dark:mask-[linear-gradient(to_bottom,black_40%,transparent)] pointer-events-none absolute inset-x-0 top-0 h-24 bg-linear-to-b from-background via-60% via-background/80 to-transparent backdrop-blur-xl dark:via-50%" />
        <div className="relative mx-auto flex h-12 w-full max-w-7xl items-center justify-between px-4 md:px-8">
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
            <span className="mr-2 ml-3 text-muted-foreground/40 sm:mx-2">
              /
            </span>
            <Select
              value={name}
              onValueChange={(value) => router.push(`/${value}`)}
              options={SUB_PROJECTS.map((p) => ({
                value: p.value,
                label: p.label,
                textValue: p.textValue,
              }))}
            />
            <span className="hidden sm:contents">
              {breadcrumbs?.map((item, index) => (
                <span key={item.href} className="contents">
                  <span className="mx-2 text-muted-foreground/40">/</span>
                  <Link
                    href={item.href}
                    className={cn(
                      "text-sm transition-colors hover:text-foreground",
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

      <main className="flex-1">{children}</main>

      <footer className="relative px-4 py-8 md:px-20">
        <div className="mx-auto flex max-w-7xl items-center justify-between text-muted-foreground text-sm">
          <p>
            By{" "}
            <Link href="/" className="transition-colors hover:text-foreground">
              assistant-ui
            </Link>
          </p>
          <p className="text-foreground/30 text-xs">
            &copy; {new Date().getFullYear()} AgentbaseAI Inc.
          </p>
        </div>
      </footer>
    </div>
  );
}
