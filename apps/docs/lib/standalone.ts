export type StandaloneComponent = {
  slug: string;
  title: string;
  description: string;
  wide?: boolean;
};

export const STANDALONE_COMPONENTS: StandaloneComponent[] = [
  {
    slug: "accordion",
    title: "Accordion",
    description:
      "A stacked set of headings that reveal or hide their sections.",
  },
  {
    slug: "badge",
    title: "Badge",
    description: "A small label for status, categories, or metadata.",
  },
  {
    slug: "diff-viewer",
    title: "Diff Viewer",
    description: "Render a code diff with additions and deletions highlighted.",
    wide: true,
  },
  {
    slug: "dot-matrix",
    title: "Dot Matrix",
    description: "A 5 by 5 indicator with twenty blink patterns for state.",
  },
  {
    slug: "number-roll",
    title: "Number Roll",
    description: "Digits that roll like an odometer when the value changes.",
  },
  {
    slug: "select",
    title: "Select",
    description: "A dropdown for choosing one value from a list.",
  },
  {
    slug: "tabs",
    title: "Tabs",
    description: "Switchable panels for grouping related content.",
  },
];

export const STANDALONE_COUNT = STANDALONE_COMPONENTS.length;

export function getStandalone(slug: string) {
  const index = STANDALONE_COMPONENTS.findIndex((item) => item.slug === slug);
  if (index === -1) return undefined;
  return { ...STANDALONE_COMPONENTS[index]!, index: index + 1 };
}

export function getStandaloneNeighbors(slug: string) {
  const index = STANDALONE_COMPONENTS.findIndex((item) => item.slug === slug);
  if (index === -1) {
    return { previous: undefined, next: undefined };
  }
  return {
    previous: STANDALONE_COMPONENTS[index - 1],
    next: STANDALONE_COMPONENTS[index + 1],
  };
}
