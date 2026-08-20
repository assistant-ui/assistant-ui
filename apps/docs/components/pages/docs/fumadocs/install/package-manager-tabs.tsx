"use client";

import { CommandTabs } from "@/components/ui/command-tabs";
import { analytics } from "@/lib/analytics";

const PACKAGE_MANAGERS = ["npm", "pnpm", "yarn", "bun", "xpm"] as const;
type PackageManager = (typeof PACKAGE_MANAGERS)[number];

const STORAGE_KEY = "aui-package-manager";

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

function buildCommands(getCommand: (pm: PackageManager) => string) {
  return Object.fromEntries(PACKAGE_MANAGERS.map((pm) => [pm, getCommand(pm)]));
}

function onPackageManagerChange(value: string) {
  analytics.install.packageManagerSelected(value);
}

export function PackageManagerTabs({
  packages,
}: {
  packages: string[];
}): React.ReactElement {
  return (
    <CommandTabs
      commands={buildCommands((pm) => getInstallCommand(pm, packages))}
      storageKey={STORAGE_KEY}
      onValueChange={onPackageManagerChange}
    />
  );
}

export function ExpoInstallTabs({
  packages,
}: {
  packages: string[];
}): React.ReactElement {
  return (
    <CommandTabs
      commands={buildCommands((pm) => getExpoInstallCommand(pm, packages))}
      storageKey={STORAGE_KEY}
      onValueChange={onPackageManagerChange}
    />
  );
}

export function ShadcnInstallTabs({
  urls,
}: {
  urls: string[];
}): React.ReactElement {
  return (
    <CommandTabs
      commands={buildCommands((pm) => getShadcnCommand(pm, urls))}
      storageKey={STORAGE_KEY}
      onValueChange={onPackageManagerChange}
    />
  );
}
