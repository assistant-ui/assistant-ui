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
  | "design"
  | "react"
  | "native"
  | "ink"
  | "cloud"
  | "cloud-ai-sdk"
  | "playground"
  | "shimmer"
  | "glass"
  | "heat"
  | "frame"
  | "o11y"
  | "examples"
  | "changelog"
  | "showcase"
  | "oss"
  | "packages"
  | "traction"
  | "blog"
  | "careers"
  | "brand";

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
  | {
      type: "mega";
      label: string;
      featured?: {
        label: string;
        item: DropdownItem;
        extraItems?: DropdownItem[];
      };
      groups: NavGroup[];
    };

export const NAV_ITEMS: NavItem[] = [
  { type: "link", label: "Docs", href: "/docs" },
  {
    type: "mega",
    label: "Products",
    featured: {
      label: "Extend",
      item: {
        label: "Elements",
        href: "/elements",
        description: "Multimodal UI. An extension, not a replacement.",
        external: false,
        glyph: "elements",
      },
      extraItems: [
        {
          label: "Design",
          href: "/design",
          description: "Every component, live.",
          external: false,
          glyph: "design",
        },
      ],
    },
    groups: [
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
            label: "Cloud AI SDK",
            href: "/cloud-ai-sdk",
            description: "Drop-in persistence for useChat",
            external: false,
            glyph: "cloud-ai-sdk",
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
      {
        label: "Primitives",
        items: [
          {
            label: "tw-shimmer",
            href: "/tw-shimmer",
            description: "Shimmer loading states for Tailwind",
            external: false,
            glyph: "shimmer",
          },
          {
            label: "tw-glass",
            href: "/tw-glass",
            description: "Glass refraction in pure CSS",
            external: false,
            glyph: "glass",
          },
          {
            label: "Heat Graph",
            href: "/heat-graph",
            description: "Headless activity heatmaps",
            external: false,
            glyph: "heat",
          },
          {
            label: "Safe Content Frame",
            href: "/safe-content-frame",
            description: "Sandboxed iframes for untrusted HTML",
            external: false,
            glyph: "frame",
          },
          {
            label: "react-o11y",
            href: "/react-o11y",
            description: "Span primitives for agent runs",
            external: false,
            glyph: "o11y",
          },
        ],
      },
    ],
  },
  {
    type: "mega",
    label: "Resources",
    featured: {
      label: "Explore",
      item: {
        label: "Examples",
        href: "/examples",
        description: "Full implementations and demos",
        external: false,
        glyph: "examples",
      },
    },
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
                  glyph: "playground" as const,
                },
              ]
            : []),
          {
            label: "Changelog",
            href: "/changelog",
            description: "Release notes and updates",
            external: false,
            glyph: "changelog",
          },
          {
            label: "Showcase",
            href: "/showcase",
            description: "Apps built with assistant-ui",
            external: false,
            glyph: "showcase",
          },
          {
            label: "Open source",
            href: "/oss",
            description: "Projects and repos in the open",
            external: false,
            glyph: "oss",
          },
          {
            label: "Packages",
            href: "/packages",
            description: "Every package we publish on npm",
            external: false,
            glyph: "packages",
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
            glyph: "blog",
          },
          {
            label: "Careers",
            href: "/careers",
            description: "Join our team",
            external: false,
            glyph: "careers",
          },
          {
            label: "Brand",
            href: "/brand",
            description: "Logos and brand assets",
            external: false,
            glyph: "brand",
          },
          {
            label: "Traction",
            href: "/traction",
            description: "Stars and downloads, live",
            external: false,
            glyph: "traction",
          },
        ],
      },
    ],
  },
  { type: "link", label: "Pricing", href: "/pricing" },
];
