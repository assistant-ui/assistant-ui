export const docsMarkdownVariantRewrites = (
  source: string,
  destinationSuffix: string,
  requireMarkdownAccept = false,
) => {
  const required = requireMarkdownAccept
    ? [
        {
          type: "header" as const,
          key: "accept",
          value: "(?:.*text/markdown.*)",
        },
      ]
    : [];

  return [
    {
      source,
      has: [
        ...required,
        {
          type: "query" as const,
          key: "platform",
          value: "(?<docsPlatform>react|rn|ink)",
        },
        { type: "query" as const, key: "view", value: "radix-ui" },
      ],
      destination: `/platform-llms.mdx/:docsPlatform/radix${destinationSuffix}`,
    },
    {
      source,
      has: [
        ...required,
        {
          type: "query" as const,
          key: "platform",
          value: "(?<docsPlatform>react|rn|ink)",
        },
      ],
      destination: `/platform-llms.mdx/:docsPlatform/base${destinationSuffix}`,
    },
    {
      source,
      has: [
        ...required,
        { type: "query" as const, key: "view", value: "radix-ui" },
      ],
      missing: [{ type: "query" as const, key: "platform" }],
      destination: `/platform-llms.mdx/react/radix${destinationSuffix}`,
    },
  ];
};

export const docsMarkdownFileRewrites = () => {
  const entries = [
    ["/docs.md", ""],
    ["/docs.mdx", ""],
    ["/docs/:path*.md", "/:path*"],
    ["/docs/:path*.mdx", "/:path*"],
  ] as const;

  return entries.flatMap(([source, destinationSuffix]) => [
    ...docsMarkdownVariantRewrites(source, destinationSuffix),
    {
      source,
      destination: `/llms.mdx${destinationSuffix}`,
    },
  ]);
};

export const docsMarkdownAcceptRewrites = () => [
  ...docsMarkdownVariantRewrites("/docs/:path*", "/:path*", true),
  {
    source: "/docs/:path*",
    has: [
      {
        type: "header" as const,
        key: "accept",
        value: "(?:.*text/markdown.*)",
      },
    ],
    destination: "/llms.mdx/:path*",
  },
];
