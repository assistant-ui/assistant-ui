"use client";

import { type ReactNode, useMemo } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import Image from "next/image";
import {
  Activity,
  Columns3,
  AppWindow,
  Box,
  ChevronDown,
  FlaskConical,
  Grid3x3,
  ShieldCheck,
  Smartphone,
  Sparkles,
  Terminal,
  type LucideIcon,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { SUB_PROJECTS } from "@/lib/constants";
import { docsSiteBaseUrl, getDocsSite } from "@/lib/docs-sites";
import { HeaderActions } from "./header-actions";
import { HeaderBrandLink } from "./header-brand-link";
import {
  headerBarClassName,
  headerSlashClassName,
  headerSwitcherClassName,
} from "./header-chrome";
import { OtherOssProjectsItem, ProjectMenuRadioItem } from "./project-menu";
import { useScrolled } from "@/hooks/use-scrolled";

export interface SubProjectBreadcrumb {
  label: string;
  href: string;
  shimmer?: boolean;
}

interface SubProjectHeaderProps {
  name: string;
  githubPath: string;
  breadcrumbs?: SubProjectBreadcrumb[];
  // Pins the header to the top of the page and centers its bar.
  sticky?: boolean;
  barClassName?: string;
  // Rendered after the theme toggle, for controls the page owns.
  actions?: ReactNode;
}

function projectLabel(project: (typeof SUB_PROJECTS)[number]) {
  if (project.slug !== "tw-shimmer") return project.label;
  return <span className="shimmer">{project.label}</span>;
}

export function SubProjectHeader({
  name,
  githubPath,
  breadcrumbs: breadcrumbsOverride,
  sticky = true,
  barClassName,
  actions,
}: SubProjectHeaderProps): React.ReactElement {
  const pathname = usePathname();
  const scrolled = useScrolled();
  const docsSite = getDocsSite(name);
  const docsHref = docsSite ? docsSiteBaseUrl(docsSite.id) : undefined;
  const docsActive =
    docsHref !== undefined &&
    (pathname === docsHref || pathname.startsWith(`${docsHref}/`));

  const current = SUB_PROJECTS.find((project) => project.slug === name);

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
    <header className={cn("z-50 w-full shrink-0", sticky && "sticky top-0")}>
      <div
        className={cn(
          "relative flex h-12 w-full items-center justify-between px-4",
          sticky && headerBarClassName(scrolled, barClassName),
        )}
      >
        <div className="flex min-w-0 items-center">
          <HeaderBrandLink
            showLabel={false}
            href={docsActive ? (current?.href ?? `/${name}`) : "/"}
            homeLabel={
              docsActive
                ? `${current?.label ?? name} home`
                : "assistant-ui home"
            }
          />
          <span className={headerSlashClassName}>/</span>
          {docsHref && docsActive ? (
            <>
              <Link
                href={docsHref}
                className="text-foreground hover:text-foreground/80 text-sm font-medium transition-colors"
              >
                docs
              </Link>
              <span className="text-muted-foreground mx-1.5 text-sm">for</span>
            </>
          ) : null}
          <ProjectSwitcher
            name={name}
            current={current}
            homeHref={docsActive ? "/docs" : "/"}
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

        <HeaderActions
          githubHref={githubPath}
          githubLabel="View on GitHub"
          githubClassName="hidden peer-empty:flex sm:flex"
          actions={actions}
        >
          <div
            data-sub-project-header-portal
            className="peer flex items-center gap-1"
          />
          {docsHref && (
            <Link
              href={docsHref}
              aria-current={docsActive ? "page" : undefined}
              className={cn(
                "hover:text-foreground px-2 text-sm transition-colors",
                docsActive
                  ? "text-foreground font-medium"
                  : "text-muted-foreground",
              )}
            >
              Docs
            </Link>
          )}
        </HeaderActions>
      </div>
    </header>
  );
}

const PROJECT_ICONS: Record<string, LucideIcon> = {
  "safe-content-frame": ShieldCheck,
  "generative-frame": AppWindow,
  "tw-shimmer": Sparkles,
  "heat-graph": Grid3x3,
  "react-o11y": Activity,
  variants: Columns3,
  native: Smartphone,
  ink: Terminal,
  playground: FlaskConical,
};

const HOME_VALUE = "__assistant-ui";

/** Same look as the docs platform switcher: the parent site, this project, and every other OSS project. */
function ProjectSwitcher({
  name,
  current,
  homeHref,
}: {
  name: string;
  current: (typeof SUB_PROJECTS)[number] | undefined;
  /** Where "assistant-ui" goes: its docs from a docs site, its home elsewhere. */
  homeHref: string;
}) {
  const router = useRouter();
  const label = current ? projectLabel(current) : name;
  const Icon = PROJECT_ICONS[name] ?? Box;
  const go = (value: string) => {
    if (value === HOME_VALUE) router.push(homeHref);
    else router.push(current?.href ?? `/${name}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Switch project"
        className={cn("group/project", headerSwitcherClassName)}
      >
        <span className="min-w-0 flex-1 truncate text-left">{label}</span>
        <ChevronDown className="text-muted-foreground/70 size-3.5 shrink-0 transition-transform duration-150 ease-out group-data-[popup-open]/project:rotate-180" />
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align="start"
        sideOffset={6}
        className="min-w-48 rounded-lg p-1"
      >
        <DropdownMenuRadioGroup
          className="flex flex-col gap-0.5"
          value={name}
          onValueChange={(value) => go(String(value))}
        >
          <ProjectMenuRadioItem
            value={HOME_VALUE}
            icon={
              <Image
                src="/favicon/icon.svg"
                alt=""
                width={16}
                height={16}
                className="size-4 shrink-0 opacity-70 dark:hue-rotate-180 dark:invert"
              />
            }
          >
            assistant-ui
          </ProjectMenuRadioItem>
          <ProjectMenuRadioItem
            value={name}
            icon={<Icon className="text-muted-foreground size-4 shrink-0" />}
          >
            {label}
          </ProjectMenuRadioItem>
          <DropdownMenuSeparator />
          <OtherOssProjectsItem />
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
