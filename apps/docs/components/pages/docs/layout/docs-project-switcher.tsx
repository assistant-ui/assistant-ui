"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Check, ChevronDown, LayoutGrid } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export type DocsProjectOption = {
  id: string;
  name: string;
  href: string;
};

export function DocsProjectSwitcher({
  projects,
}: {
  projects: DocsProjectOption[];
}) {
  const pathname = usePathname();
  const activeProject = [...projects]
    .filter(
      (project) =>
        !isExternal(project.href) &&
        (pathname === project.href || pathname.startsWith(`${project.href}/`)),
    )
    .sort((a, b) => b.href.length - a.href.length)[0];
  const currentProject = activeProject ?? projects[0];

  if (!currentProject) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="hover:bg-foreground/[0.04] focus-visible:ring-ring group -ml-1.5 flex shrink-0 items-center gap-2 rounded-md px-1.5 py-1 text-sm font-medium tracking-tight transition-colors outline-none focus-visible:ring-2"
        aria-label={`Switch open-source project, currently ${currentProject.name}`}
      >
        <Image
          src="/favicon/icon.svg"
          alt=""
          width={18}
          height={18}
          className="size-[18px] dark:hue-rotate-180 dark:invert"
        />
        <span className="hidden sm:inline">{currentProject.name}</span>
        <ChevronDown className="text-muted-foreground size-3.5 transition-transform group-data-[popup-open]:rotate-180" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="start" sideOffset={8} className="w-64">
        {projects.map((project) => (
          <ProjectItem
            key={project.id}
            project={project}
            active={project.id === currentProject.id}
          />
        ))}

        <DropdownMenuSeparator />
        <DropdownMenuItem render={<Link href="/oss" />} className="py-2">
          <LayoutGrid className="size-4" />
          <span className="flex-1">All open-source projects</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function ProjectItem({
  project,
  active,
}: {
  project: DocsProjectOption;
  active: boolean;
}) {
  const content = (
    <>
      <span className="flex size-4 items-center justify-center">
        <Check
          className={cn(
            "size-3.5 transition-opacity",
            active ? "opacity-100" : "opacity-0",
          )}
        />
      </span>
      <span className="min-w-0 flex-1 truncate">{project.name}</span>
      {isExternal(project.href) ? (
        <ArrowUpRight className="text-muted-foreground size-3.5" />
      ) : null}
    </>
  );

  return (
    <DropdownMenuItem
      aria-current={active ? "page" : undefined}
      className="py-2"
      render={
        isExternal(project.href) ? (
          <a href={project.href} target="_blank" rel="noopener noreferrer" />
        ) : (
          <Link href={project.href} />
        )
      }
    >
      {content}
    </DropdownMenuItem>
  );
}

function isExternal(href: string) {
  return href.startsWith("http");
}
