import Link from "next/link";

export const GROUPS: {
  label: string;
  links: { label: string; href: string }[];
}[] = [
  {
    label: "Build",
    links: [
      { label: "Primitives", href: "/docs/primitives" },
      { label: "Components", href: "/docs/ui/thread" },
      { label: "Tool UI", href: "/docs/tools/tool-ui" },
      { label: "MCP servers", href: "/docs/tools/mcp" },
      { label: "API reference", href: "/docs/api-reference/overview" },
    ],
  },
  {
    label: "Guides",
    links: [
      { label: "Attachments", href: "/docs/guides/attachments" },
      { label: "Branching", href: "/docs/guides/branching" },
      { label: "Voice", href: "/docs/guides/voice" },
      { label: "Persistence", href: "/docs/cloud" },
      { label: "Migrations", href: "/docs/migrations" },
    ],
  },
  {
    label: "Platforms",
    links: [
      { label: "React", href: "/docs/installation" },
      { label: "React Native", href: "/docs/react-native" },
      { label: "React Ink", href: "/docs/ink" },
      { label: "Agent skills", href: "/docs/llm" },
      { label: "Examples", href: "/examples" },
    ],
  },
];

export function QuickLinks() {
  return (
    <div className="not-prose grid gap-8 sm:grid-cols-3">
      {GROUPS.map((group) => (
        <div key={group.label} className="flex flex-col gap-2.5">
          <span className="text-muted-foreground text-xs font-medium">
            {group.label}
          </span>
          {group.links.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-foreground/80 hover:text-foreground w-fit text-sm transition-colors"
            >
              {link.label}
            </Link>
          ))}
        </div>
      ))}
    </div>
  );
}
