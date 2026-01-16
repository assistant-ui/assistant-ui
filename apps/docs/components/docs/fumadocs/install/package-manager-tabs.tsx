"use client";

import { DynamicCodeBlock } from "fumadocs-ui/components/dynamic-codeblock";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

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

function getElementStyle(el: HTMLElement | null): {
  left: number;
  width: number;
} {
  if (!el) return { left: 0, width: 0 };
  return { left: el.offsetLeft, width: el.offsetWidth };
}

export function PackageManagerTabs({ packages }: { packages: string[] }) {
  const [pm, setPm] = useState<PackageManager>("npm");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeStyle, setActiveStyle] = useState({ left: 0, width: 0 });
  const [hoverStyle, setHoverStyle] = useState({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const activeIndex = PACKAGE_MANAGERS.indexOf(pm);

  useEffect(() => {
    const el = tabRefs.current[activeIndex];
    if (el) setActiveStyle(getElementStyle(el));
  }, [activeIndex]);

  useEffect(() => {
    if (hoveredIndex === null) return;
    const el = tabRefs.current[hoveredIndex];
    if (el) setHoverStyle(getElementStyle(el));
  }, [hoveredIndex]);

  useEffect(() => {
    requestAnimationFrame(() => {
      const el = tabRefs.current[activeIndex];
      if (el) setActiveStyle(getElementStyle(el));
    });
  }, []);

  return (
    <div className="not-prose my-4 overflow-hidden rounded-xl bg-[oklch(0.97_0_0)] dark:bg-[oklch(0.16_0_0)]">
      <div className="relative flex items-center gap-1 px-3 py-2">
        {/* Hover indicator */}
        {hoveredIndex !== null && hoverStyle.width > 0 && (
          <div
            className="pointer-events-none absolute h-6.5 rounded-md bg-[oklch(0.88_0_0)] transition-all duration-200 ease-out dark:bg-[oklch(0.25_0_0)]"
            style={{
              left: `${hoverStyle.left}px`,
              width: `${hoverStyle.width}px`,
            }}
          />
        )}

        {/* Active indicator */}
        <div
          className="pointer-events-none absolute h-6.5 rounded-md bg-[oklch(0.92_0_0)] transition-all duration-200 ease-out dark:bg-[oklch(0.22_0_0)]"
          style={{
            left: `${activeStyle.left}px`,
            width: `${activeStyle.width}px`,
          }}
        />

        {PACKAGE_MANAGERS.map((manager, index) => (
          <button
            key={manager}
            ref={(el) => {
              tabRefs.current[index] = el;
            }}
            type="button"
            onClick={() => setPm(manager)}
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
        <DynamicCodeBlock lang="bash" code={getInstallCommand(pm, packages)} />
      </div>
    </div>
  );
}
