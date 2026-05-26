import Link from "next/link";

const links = [
  { href: "/", label: "Tool UI demo" },
  { href: "/primitive", label: "Static primitive" },
  { href: "/gui-chat", label: "GUI chat" },
] as const;

export function ExampleNav() {
  return (
    <nav className="bg-background flex flex-wrap items-center gap-2 border-b px-4 py-2 text-sm">
      <span className="text-muted-foreground font-medium">Examples:</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="text-foreground hover:bg-muted rounded-md px-2 py-1"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
