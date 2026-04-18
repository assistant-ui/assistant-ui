"use client";

import { useState } from "react";
import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { cn } from "@/lib/utils";
import { useAnimatedTabs } from "@/hooks/use-animated-tabs";
import { analytics } from "@/lib/analytics";

const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun", "xpm"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

function getInstallCommand(pm: PackageManager, packages: string[]): string {
  const pkgList = packages.join(" ");
  switch (pm) {
    case "npm":
      return `npm install ${pkgList}`;
    case "yarn":
      return `yarn add ${pkgList}`;
    case "pnpm":
      return `pnpm add ${pkgList}`;
    case "bun":
      return `bun add ${pkgList}`;
    case "xpm":
      return `xpm add ${pkgList}`;
  }
}

function getShadcnCommand(pm: PackageManager, urls: string[]): string {
  const urlList = urls.join(" ");
  switch (pm) {
    case "npm":
    case "yarn":
      return `npx shadcn@latest add ${urlList}`;
    case "pnpm":
      return `pnpm dlx shadcn@latest add ${urlList}`;
    case "bun":
      return `bunx --bun shadcn@latest add ${urlList}`;
    case "xpm":
      return `xpx shadcn@latest add ${urlList}`;
  }
}

function CommandTabs({
  getCommand,
}: {
  getCommand: (pm: PackageManager) => string;
}) {
  const [pm, setPm] = useState<PackageManager>("npm");
  const activeIndex = PACKAGE_MANAGERS.indexOf(pm);

  const {
    containerRef,
    tabRefs,
    hoveredIndex,
    setHoveredIndex,
    activeStyle,
    hoverStyle,
  } = useAnimatedTabs({ activeIndex });

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl bg-[oklch(0.97_0_0)] dark:bg-[oklch(0.16_0_0)]">
      <div
        ref={containerRef}
        className="relative flex items-center gap-1 px-3 py-2"
      >
        {hoveredIndex !== null && hoverStyle.width > 0 && (
          <div
            className="pointer-events-none absolute h-6.5 rounded-md bg-[oklch(0.88_0_0)] transition-all duration-200 ease-out dark:bg-[oklch(0.25_0_0)]"
            style={{
              left: `${hoverStyle.left}px`,
              width: `${hoverStyle.width}px`,
            }}
          />
        )}

        {activeStyle.width > 0 && (
          <div
            className="pointer-events-none absolute h-6.5 rounded-md bg-[oklch(0.92_0_0)] transition-all duration-200 ease-out dark:bg-[oklch(0.22_0_0)]"
            style={{
              left: `${activeStyle.left}px`,
              width: `${activeStyle.width}px`,
            }}
          />
        )}

        {PACKAGE_MANAGERS.map((manager, index) => (
          <button
            key={manager}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            onClick={() => {
              if (pm !== manager) {
                analytics.install.packageManagerSelected(manager);
              }
              setPm(manager);
            }}
            onMouseEnter={() => setHoveredIndex(index)}
            onMouseLeave={() => setHoveredIndex(null)}
            className={cn(
              "relative z-10 rounded-md px-2.5 py-1 font-medium text-xs transition-colors duration-200",
              pm === manager
                ? "text-foreground"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {manager}
          </button>
        ))}
      </div>
      <div className="[&_figure]:my-0! [&_figure]:rounded-none! [&_figure]:bg-transparent!">
        <DynamicCodeBlock lang="bash" code={getCommand(pm)} />
      </div>
    </div>
  );
}

export function PackageManagerTabs({
  packages,
}: {
  packages: string[];
}): React.ReactElement {
  return <CommandTabs getCommand={(pm) => getInstallCommand(pm, packages)} />;
}

export function ShadcnInstallTabs({
  urls,
}: {
  urls: string[];
}): React.ReactElement {
  return <CommandTabs getCommand={(pm) => getShadcnCommand(pm, urls)} />;
}
