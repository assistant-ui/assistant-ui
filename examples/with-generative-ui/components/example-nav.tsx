import Link from "next/link";

const links = [
  { href: "/", label: "Tool UI demo" },
  { href: "/primitive", label: "Static primitive" },
  { href: "/gui-chat", label: "GUI chat" },
] as const;

export function ExampleNav() {
  return (
    <nav className="flex flex-wrap items-center gap-2 border-b bg-background px-4 py-2 text-sm">
      <span className="font-medium text-muted-foreground">Examples:</span>
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="rounded-md px-2 py-1 text-foreground hover:bg-muted"
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
