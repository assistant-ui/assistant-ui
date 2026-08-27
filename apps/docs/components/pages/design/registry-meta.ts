export type DesignComponentMeta = {
  slug: string;
  name: string;
  description: string;
};

export type DesignSectionMeta = {
  label: string;
  components: DesignComponentMeta[];
};

export const DESIGN_SECTIONS: DesignSectionMeta[] = [
  {
    label: "Actions",
    components: [
      {
        slug: "button",
        name: "Button",
        description:
          "The pressable object: thin, flat, and 8px round, in every weight a surface needs.",
      },
      {
        slug: "dropdown-menu",
        name: "Dropdown Menu",
        description:
          "Actions behind a trigger: items, shortcuts, and separators on a quiet surface.",
      },
    ],
  },
  {
    label: "Inputs",
    components: [
      {
        slug: "input",
        name: "Input",
        description: "A single-line field with a label, drawn with a hairline.",
      },
      {
        slug: "select",
        name: "Select",
        description: "Pick one value from a list, with groups and sizes.",
      },
      {
        slug: "combobox",
        name: "Combobox",
        description: "Type to filter, then pick: a select with a search field.",
      },
      {
        slug: "switch",
        name: "Switch",
        description:
          "A binary control in two sizes; the only capsule in the kit.",
      },
      {
        slug: "kbd",
        name: "Kbd",
        description: "Keyboard keys as printed caps, for shortcuts and hints.",
      },
    ],
  },
  {
    label: "Display",
    components: [
      {
        slug: "badge",
        name: "Badge",
        description: "A small label for status, categories, or metadata.",
      },
      {
        slug: "avatar",
        name: "Avatar",
        description:
          "People as initials or images, alone or stacked in groups.",
      },
      {
        slug: "skeleton",
        name: "Skeleton",
        description: "The loading shape of content that has a known layout.",
      },
      {
        slug: "separator",
        name: "Separator",
        description: "A hairline between things, horizontal or vertical.",
      },
      {
        slug: "number-roll",
        name: "Number Roll",
        description:
          "Numbers that roll to their next value instead of jumping.",
      },
      {
        slug: "dot-matrix",
        name: "Dot Matrix",
        description:
          "A dot-grid indicator for connecting, running, and settled states.",
      },
      {
        slug: "diff-viewer",
        name: "Diff Viewer",
        description: "Code changes as unified or split diffs, line by line.",
      },
      {
        slug: "scrollbar",
        name: "Scrollbar",
        description:
          "A quiet overlay scrollbar for panes that keep their own scroll.",
      },
      {
        slug: "callout",
        name: "Callout",
        description:
          "A quiet aside on a colored rule, for notes, warnings, and errors in prose.",
      },
      {
        slug: "steps",
        name: "Steps",
        description: "A numbered rail for processes that happen in order.",
      },
      {
        slug: "code-block",
        name: "Code Block",
        description:
          "Highlighted code on a field panel, with a title bar and a copy button.",
      },
      {
        slug: "command-tabs",
        name: "Command Tabs",
        description:
          "One command in several dialects, with synced tabs and a copy button.",
      },
      {
        slug: "table",
        name: "Table",
        description:
          "A print-register data table with hairline rules and mono headers.",
      },
      {
        slug: "definition-list",
        name: "Definition List",
        description: "A spec sheet of terms and details, one hairline per row.",
      },
    ],
  },
  {
    label: "Overlay",
    components: [
      {
        slug: "dialog",
        name: "Dialog",
        description: "A modal sheet for decisions that need the page to wait.",
      },
      {
        slug: "popover",
        name: "Popover",
        description: "Anchored detail on demand, dismissed by clicking away.",
      },
      {
        slug: "tooltip",
        name: "Tooltip",
        description:
          "A short label that appears on hover and stays out of the way.",
      },
      {
        slug: "sheet",
        name: "Sheet",
        description: "A panel that slides in from an edge for secondary flows.",
      },
      {
        slug: "toast",
        name: "Toast",
        description:
          "A passing message for outcomes: success, error, and undo.",
      },
    ],
  },
  {
    label: "Navigation",
    components: [
      {
        slug: "tabs",
        name: "Tabs",
        description: "Switch between views without leaving the page.",
      },
      {
        slug: "breadcrumb",
        name: "Breadcrumb",
        description: "Where you are, as a path you can walk back up.",
      },
      {
        slug: "accordion",
        name: "Accordion",
        description: "Sections that expand one at a time, or all at once.",
      },
      {
        slug: "collapsible",
        name: "Collapsible",
        description: "One region that folds open and closed in place.",
      },
    ],
  },
];

export const DESIGN_COMPONENTS = DESIGN_SECTIONS.flatMap(
  (section) => section.components,
);

export function getDesignComponentMeta(
  slug: string,
): DesignComponentMeta | undefined {
  return DESIGN_COMPONENTS.find((component) => component.slug === slug);
}

export function getDesignSectionLabel(slug: string): string | undefined {
  return DESIGN_SECTIONS.find((section) =>
    section.components.some((component) => component.slug === slug),
  )?.label;
}
