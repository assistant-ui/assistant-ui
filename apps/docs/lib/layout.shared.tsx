import Image from "next/image";
import type { DocsLayoutProps } from "fumadocs-ui/layouts/docs";
import type { BaseLayoutProps } from "fumadocs-ui/layouts/shared";
import { DiscordIcon } from "@/components/icons/discord";
import icon from "@/public/favicon/icon.svg";

// shared configuration
export const baseOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/assistant-ui/assistant-ui",
  links: [
    {
      type: "icon",
      icon: <DiscordIcon className="size-4" />,
      text: "Discord",
      url: "https://discord.gg/S9dwgCNEFs",
    },
  ],
  themeSwitch: {
    enabled: false,
  },
  nav: {
    title: (
      <>
        <Image
          src={icon}
          alt="logo"
          width={18}
          height={18}
          className="inline dark:hue-rotate-180 dark:invert"
        />
        <span className="font-medium text-base tracking-tight">
          assistant-ui
        </span>
      </>
    ),
    transparentMode: "none",
  },
};

export const sharedDocsOptions: Partial<DocsLayoutProps> = {
  ...baseOptions,
  sidebar: {
    defaultOpenLevel: 1,
    collapsible: false,
  },
  searchToggle: {
    enabled: false,
  },
};
