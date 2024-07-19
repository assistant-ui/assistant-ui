import { type BaseLayoutProps, type DocsLayoutProps } from "fumadocs-ui/layout";
import { pageTree } from "@/app/source";
import { RootToggle } from "fumadocs-ui/components/layout/root-toggle";
import { BookIcon, LayoutTemplateIcon, PhoneCallIcon } from "lucide-react";
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

const DiscordIcon = () => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 127.14 96.36"
      className="size-4"
    >
      <path
        fill="currentColor"
        d="M107.7,8.07A105.15,105.15,0,0,0,81.47,0a72.06,72.06,0,0,0-3.36,6.83A97.68,97.68,0,0,0,49,6.83,72.37,72.37,0,0,0,45.64,0,105.89,105.89,0,0,0,19.39,8.09C2.79,32.65-1.71,56.6.54,80.21h0A105.73,105.73,0,0,0,32.71,96.36,77.7,77.7,0,0,0,39.6,85.25a68.42,68.42,0,0,1-10.85-5.18c.91-.66,1.8-1.34,2.66-2a75.57,75.57,0,0,0,64.32,0c.87.71,1.76,1.39,2.66,2a68.68,68.68,0,0,1-10.87,5.19,77,77,0,0,0,6.89,11.1A105.25,105.25,0,0,0,126.6,80.22h0C129.24,52.84,122.09,29.11,107.7,8.07ZM42.45,65.69C36.18,65.69,31,60,31,53s5-12.74,11.43-12.74S54,46,53.89,53,48.84,65.69,42.45,65.69Zm42.24,0C78.41,65.69,73.25,60,73.25,53s5-12.74,11.44-12.74S96.23,46,96.12,53,91.08,65.69,84.69,65.69Z"
      />
    </svg>
  );
};

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
      text: "Enterprise Inquiry",
      url: "https://cal.com/simon-farshid/assistant-ui",
      icon: <PhoneCallIcon />,
      external: true,
    },
    {
      type: "secondary",
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
