export const BASE_URL = "https://www.assistant-ui.com";

export type Product = {
  /** Route segment for internal products (e.g. "tw-shimmer", "native"). Omit for external. */
  slug?: string;
  label: string;
  href: string;
  description: string;
  external: boolean;
};

export const PRODUCTS: Product[] = [
  {
    label: "Tool UI",
    href: "https://tool-ui.com/",
    description: "Build tool UIs for AI agents",
    external: true,
  },
  {
    slug: "tw-shimmer",
    label: "tw-shimmer",
    href: "/tw-shimmer",
    description: "Tailwind CSS shimmer effects",
    external: false,
  },
  {
    slug: "safe-content-frame",
    label: "Safe Content Frame",
    href: "/safe-content-frame",
    description: "Secure sandboxed iframes",
    external: false,
  },
  {
    slug: "mcp-app-studio",
    label: "MCP App Studio",
    href: "/mcp-app-studio",
    description: "Build apps for AI assistants",
    external: false,
  },
  {
    slug: "native",
    label: "React Native",
    href: "/native",
    description: "Build mobile apps with React Native",
    external: false,
  },
  {
    slug: "ink",
    label: "Ink",
    href: "/ink",
    description: "Build interactive experiences with Ink",
    external: false,
  },
  {
    slug: "cloud-ai-sdk",
    label: "Cloud AI SDK",
    href: "/cloud-ai-sdk",
    description: "Cloud persistence for AI SDK apps",
    external: false,
  },
  {
    slug: "heat-graph",
    label: "Heat Graph",
    href: "/heat-graph",
    description: "Activity heatmap graph components",
    external: false,
  },
];

/** Internal products/pages that have sub-project routes (used by SubProjectLayout switcher). */
export const SUB_PROJECTS: (Product & { slug: string })[] = [
  {
    slug: "playground",
    label: "Playground",
    href: "/playground",
    description: "Interactive playground",
    external: false,
  },
  ...PRODUCTS.filter((p): p is Product & { slug: string } => !!p.slug),
];

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
  { type: "link", label: "Cloud", href: "https://cloud.assistant-ui.com" },
  { type: "link", label: "Playground", href: "/playground" },
  {
    type: "dropdown",
    label: "Products",
    items: PRODUCTS,
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
        label: "Changelog",
        href: "/changelog",
        description: "Release notes and version history",
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
