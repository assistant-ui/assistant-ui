import {
  BookIcon,
  CloudIcon,
  ProjectorIcon,
  SparklesIcon,
  WalletIcon,
  BoltIcon,
} from "lucide-react";
import icon from "@/public/favicon/icon.svg";
import Image from "next/image";
import { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { SidebarSearch } from "@/components/docs/sidebar-search";
import { DiscordIcon } from "@/components/icons/discord";

// shared configuration
export const baseOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/assistant-ui/assistant-ui",
  themeSwitch: {
    component: <ThemeToggle />,
  },
  nav: {
    title: (
      <>
        <Image
          src={icon}
          alt="logo"
          className="inline size-4 dark:hue-rotate-180 dark:invert"
        />
        <span className="font-medium">assistant-ui</span>
      </>
    ),
    transparentMode: "none",
  },
  links: [
    {
      text: "Docs",
      url: "/docs/getting-started",
      icon: <BookIcon />,
      active: "nested-url",
    },
    {
      text: "Showcase",
      url: "/showcase",
      icon: <ProjectorIcon />,
    },
    {
      text: "Examples",
      url: "/examples",
      icon: <SparklesIcon />,
    },
    {
      text: "Dashboard",
      url: "https://cloud.assistant-ui.com/",
      icon: <CloudIcon />,
    },
    {
      text: "Tool UI",
      url: "https://tool-ui.com",
      icon: <BoltIcon />,
      external: true,
    },
    {
      text: "Pricing",
      url: "/pricing",
      icon: <WalletIcon />,
    },
    {
      type: "icon",
      text: "Discord",
      url: "https://discord.gg/S9dwgCNEFs",
      icon: <DiscordIcon />,
      external: true,
    },
  ],
};

export const sharedDocsOptions: Partial<DocsLayoutProps> = {
  ...baseOptions,
  sidebar: {
    defaultOpenLevel: 1,
    collapsible: false,
  },
  searchToggle: {
    components: {
      lg: <SidebarSearch />,
    },
  },
};
