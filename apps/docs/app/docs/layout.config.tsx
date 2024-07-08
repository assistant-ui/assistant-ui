import { type BaseLayoutProps, type DocsLayoutProps } from "fumadocs-ui/layout";
import { pageTree } from "@/app/source";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { BookIcon, LayoutTemplateIcon, UserIcon } from "lucide-react";
import { LibraryIcon, type LucideIcon } from "lucide-react";
import icon from "@/public/favicon/favicon.svg";
import Image from "next/image";

type Mode = {
  url: string;
  title: string;
  description: string;
  icon: LucideIcon;
  param: string;
};

export const modes: Mode[] = [
  {
    icon: LibraryIcon,
    title: "Documentation",
    description: "@assistant-ui/react",
    url: "/docs",
    param: "docs",
  },
  {
    icon: LibraryIcon,
    title: "Reference",
    description: "@assistant-ui/react",
    url: "/reference",
    param: "reference",
  },
];

// shared configuration
export const baseOptions: BaseLayoutProps = {
  githubUrl: "https://github.com/Yonom/assistant-ui",
  nav: {
    title: (
      <>
        <Image src={icon} alt="logo" className="inline size-4" />
        <span className="font-medium">assistant-ui</span>
      </>
    ),
    transparentMode: "none",
  },
  links: [
    {
      text: "Documentation",
      url: "/docs",
      icon: <BookIcon />,
      active: "nested-url",
    },
    {
      text: "Reference",
      url: "/reference",
      icon: <BookIcon />,
      active: "nested-url",
    },
    {
      text: "Examples",
      url: "/examples",
      icon: <LayoutTemplateIcon />,
    },
    {
      text: "Discord",
      url: "https://discord.gg/S9dwgCNEFs",
      icon: <UserIcon />,
      external: true,
    },
  ],
};

export const sharedDocsOptions: Partial<DocsLayoutProps> = {
  ...baseOptions,
  sidebar: {
    defaultOpenLevel: 0,
    banner: (
      <RootToggle
        options={modes.map((mode) => ({
          url: mode.url,
          icon: (
            <mode.icon
              className="from-background/80 size-9 shrink-0 rounded-md bg-gradient-to-t p-1.5"
              style={{
                backgroundColor: `hsl(var(--${mode.param}-color)/.3)`,
                color: `hsl(var(--${mode.param}-color))`,
              }}
            />
          ),
          title: mode.title,
          description: mode.description,
        }))}
      />
    ),
  },
};

// docs layout configuration
export const docsOptions: DocsLayoutProps = {
  ...sharedDocsOptions,
  tree: pageTree,
};
