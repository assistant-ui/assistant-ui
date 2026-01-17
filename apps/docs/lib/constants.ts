export const BASE_URL = "https://www.assistant-ui.com";

export type DropdownItem = {
  label: string;
  href: string;
  description: string;
  external: boolean;
};

export type NavItem =
  | { type: "link"; label: string; href: string }
  | { type: "dropdown"; label: string; items: DropdownItem[] };

export const NAV_ITEMS: NavItem[] = [
  { type: "link", label: "Docs", href: "/docs" },
  { type: "link", label: "Showcase", href: "/showcase" },
  { type: "link", label: "Examples", href: "/examples" },
  { type: "link", label: "Playground", href: "/playground" },
  {
    type: "dropdown",
    label: "Products",
    items: [
      {
        label: "Dashboard",
        href: "https://cloud.assistant-ui.com/",
        description: "Manage your cloud projects",
        external: true,
      },
      {
        label: "Tool UI",
        href: "https://tool-ui.com/",
        description: "Build tool UIs for AI agents",
        external: true,
      },
      {
        label: "tw-shimmer",
        href: "/tw-shimmer",
        description: "Tailwind CSS shimmer effects",
        external: false,
      },
      {
        label: "Safe Content Frame",
        href: "/safe-content-frame",
        description: "Secure sandboxed iframes",
        external: false,
      },
      {
        label: "ChatGPT App Studio",
        href: "/chatgpt-app-studio",
        description: "Build ChatGPT apps",
        external: false,
      },
    ],
  },
  {
    type: "dropdown",
    label: "Resources",
    items: [
      {
        label: "Blog",
        href: "/blog",
        description: "Latest news and updates",
        external: false,
      },
      {
        label: "Careers",
        href: "/careers",
        description: "Join our team",
        external: false,
      },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
];
