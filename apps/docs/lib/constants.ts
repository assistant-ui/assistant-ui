import { isAiPlaygroundEnabled } from "./feature-flags";

export const BASE_URL = "https://www.assistant-ui.com";
export const CLOUD_URL = "https://cloud.assistant-ui.com";

export const PLATFORMS = ["react", "rn", "ink"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const DEFAULT_PLATFORM: Platform = "react";

export const PLATFORM_LABELS: Record<Platform, string> = {
  react: "React",
  rn: "React Native",
  ink: "React Ink",
};

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
    slug: "tw-shimmer",
    label: "tw-shimmer",
    href: "/tw-shimmer",
    description: "Tailwind CSS shimmer effects",
    external: false,
  },
  {
    slug: "tw-glass",
    label: "tw-glass",
    href: "/tw-glass",
    description: "Tailwind CSS glass refraction effects",
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
  {
    slug: "react-o11y",
    label: "react-o11y",
    href: "/react-o11y",
    description: "Observability span primitives",
    external: false,
  },
];

/** Internal products/pages that have sub-project routes (used by SubProjectLayout switcher). */
export const SUB_PROJECTS: (Product & { slug: string })[] = [
  ...(isAiPlaygroundEnabled
    ? [
        {
          slug: "learn",
          label: "Learn",
          href: "/learn",
          description: "Guided assistant-ui courses",
          external: false,
        },
      ]
    : []),
  {
    slug: "playground",
    label: "Playground",
    href: "/playground",
    description: "Interactive playground",
    external: false,
  },
  ...PRODUCTS.filter((p): p is Product & { slug: string } => !!p.slug),
];

export type NavGlyphKind =
  | "elements"
  | "react"
  | "native"
  | "ink"
  | "cloud"
  | "playground";

export type DropdownItem = {
  label: string;
  href: string;
  description: string;
  external: boolean;
  glyph?: NavGlyphKind;
};

export type NavGroup = {
  label: string;
  items: DropdownItem[];
};

export type NavItem =
  | { type: "link"; label: string; href: string }
  | { type: "mega"; label: string; groups: NavGroup[] };

export const NAV_ITEMS: NavItem[] = [
  { type: "link", label: "Docs", href: "/docs" },
  {
    type: "mega",
    label: "Products",
    groups: [
      {
        label: "Extend",
        items: [
          {
            label: "Elements",
            href: "/elements",
            description: "Multimodal UI. An extension, not a replacement.",
            external: false,
            glyph: "elements",
          },
        ],
      },
      {
        label: "Platforms",
        items: [
          {
            label: "React",
            href: "/docs",
            description: "The web distribution",
            external: false,
            glyph: "react",
          },
          {
            label: "React Native",
            href: "/native",
            description: "Mobile apps on the same runtime",
            external: false,
            glyph: "native",
          },
          {
            label: "Ink",
            href: "/ink",
            description: "Terminal UIs on the same runtime",
            external: false,
            glyph: "ink",
          },
        ],
      },
      {
        label: "Hosted",
        items: [
          {
            label: "Cloud",
            href: CLOUD_URL,
            description: "Hosted threads and persistence",
            external: true,
            glyph: "cloud",
          },
          {
            label: "Playground",
            href: "/playground",
            description: "Try the library in the browser",
            external: false,
            glyph: "playground",
          },
        ],
      },
    ],
  },
  {
    type: "mega",
    label: "Resources",
    groups: [
      {
        label: "Learn",
        items: [
          ...(isAiPlaygroundEnabled
            ? [
                {
                  label: "Interactive course",
                  href: "/learn",
                  description: "Build your first AI app, step by step",
                  external: false,
                },
              ]
            : []),
          {
            label: "Changelog",
            href: "/changelog",
            description: "Release notes and updates",
            external: false,
          },
          {
            label: "Showcase",
            href: "/showcase",
            description: "Apps built with assistant-ui",
            external: false,
          },
          {
            label: "Examples",
            href: "/examples",
            description: "Full implementations and demos",
            external: false,
          },
        ],
      },
      {
        label: "Company",
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
          {
            label: "Brand",
            href: "/brand",
            description: "Logos and brand assets",
            external: false,
          },
        ],
      },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
];
