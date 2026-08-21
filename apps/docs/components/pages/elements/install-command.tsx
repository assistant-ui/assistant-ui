"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { mono } from "@/components/elements/surfaces";
import { CopyButton } from "@/components/shared/copy-button";

const MANAGERS = [
  { key: "npm", runner: "npx", install: "npm install" },
  { key: "pnpm", runner: "pnpm dlx", install: "pnpm add" },
  { key: "yarn", runner: "yarn dlx", install: "yarn add" },
  { key: "bun", runner: "bunx --bun", install: "bun add" },
] as const;

type ManagerKey = (typeof MANAGERS)[number]["key"];

const STORAGE_KEY = "aui-elements-pm";

export function InstallCommand({
  registryName,
  npmPackage,
}: {
  registryName?: string;
  npmPackage?: string;
}) {
  const [manager, setManager] = useState<ManagerKey>("npm");

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (MANAGERS.some((entry) => entry.key === stored)) {
      setManager(stored as ManagerKey);
    }
  }, []);

  const active = MANAGERS.find((entry) => entry.key === manager)!;
  const command = npmPackage
    ? `${active.install} ${npmPackage}`
    : `${active.runner} shadcn@latest add "@assistant-ui/${registryName}"`;

  return (
    <>
      <div className="flex items-center gap-3">
        <h2 className="text-sm font-medium">Installation</h2>
        <div className="ms-auto flex items-center gap-0.5">
          {MANAGERS.map((entry) => {
            const selected = entry.key === manager;
            return (
              <button
                key={entry.key}
                type="button"
                aria-pressed={selected}
                onClick={() => {
                  setManager(entry.key);
                  localStorage.setItem(STORAGE_KEY, entry.key);
                }}
                className={cn(
                  mono,
                  "h-6 rounded-full px-2.5 transition-[color,background-color] duration-150 motion-reduce:transition-none",
                  selected
                    ? "bg-foreground/[0.05] text-foreground dark:bg-foreground/[0.08]"
                    : "text-foreground/40 hover:text-foreground/90",
                )}
              >
                {entry.key}
              </button>
            );
          })}
        </div>
        <CopyButton text={command} />
      </div>
      <div className="bg-foreground/[0.025] text-foreground/70 dark:bg-foreground/[0.04] mt-4 flex items-center overflow-x-auto rounded-2xl px-5 py-3.5 font-mono text-[12.5px] whitespace-nowrap">
        {command}
      </div>
    </>
  );
}
