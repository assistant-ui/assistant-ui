"use client";

import { useRef } from "react";
import { CommandTabs as KitCommandTabs } from "@/components/ui/command-tabs";
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

function getExpoInstallCommand(pm: PackageManager, packages: string[]): string {
  const pkgList = packages.join(" ");
  switch (pm) {
    case "npm":
      return `npx expo install ${pkgList}`;
    case "yarn":
      return `npx expo install --yarn ${pkgList}`;
    case "pnpm":
      return `npx expo install --pnpm ${pkgList}`;
    case "bun":
      return `npx expo install --bun ${pkgList}`;
    case "xpm":
      return `xpx expo install ${pkgList}`;
  }
}

function getAssistantUiAddCommand(pm: PackageManager, items: string[]): string {
  const itemList = items.join(" ");
  switch (pm) {
    case "npm":
    case "yarn":
      return `npx assistant-ui@latest add ${itemList}`;
    case "pnpm":
      return `pnpm dlx assistant-ui@latest add ${itemList}`;
    case "bun":
      return `bunx --bun assistant-ui@latest add ${itemList}`;
    case "xpm":
      return `xpx assistant-ui@latest add ${itemList}`;
  }
}

function CommandTabs({
  getCommand,
  packageManagers = PACKAGE_MANAGERS,
}: {
  getCommand: (pm: PackageManager) => string;
  packageManagers?: readonly PackageManager[];
}) {
  const lastPicked = useRef<string | null>(null);
  const commands = Object.fromEntries(
    packageManagers.map((pm) => [pm, getCommand(pm)]),
  );

  return (
    <KitCommandTabs
      className="my-4"
      commands={commands}
      storageKey="package-manager"
      onValueChange={(value) => {
        if (value === lastPicked.current) return;
        lastPicked.current = value;
        analytics.install.packageManagerSelected(value as PackageManager);
      }}
    />
  );
}

export function PackageManagerTabs({
  packages,
}: {
  packages: string[];
}): React.ReactElement {
  return <CommandTabs getCommand={(pm) => getInstallCommand(pm, packages)} />;
}

export function ExpoInstallTabs({
  packages,
}: {
  packages: string[];
}): React.ReactElement {
  return (
    <CommandTabs getCommand={(pm) => getExpoInstallCommand(pm, packages)} />
  );
}

export function AssistantUiAddTabs({
  items,
}: {
  items: string[];
}): React.ReactElement {
  return (
    <CommandTabs getCommand={(pm) => getAssistantUiAddCommand(pm, items)} />
  );
}

export function ShadcnInstallTabs({
  urls,
}: {
  urls: string[];
}): React.ReactElement {
  return <CommandTabs getCommand={(pm) => getShadcnCommand(pm, urls)} />;
}
