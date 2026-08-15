import Image from "next/image";
import Link from "next/link";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { cn } from "@/lib/utils";
import { gutter, meta } from "./atlas";

const LINKS = [
  { label: "documentation", href: "/docs" },
  { label: "elements", href: "/elements" },
  { label: "playground", href: "/playground" },
  { label: "changelog", href: "/changelog" },
];

export function Colophon() {
  return (
    <footer className={cn(gutter, "border-t border-(--da-line) py-12")}>
      <div className="flex flex-wrap items-start justify-between gap-x-16 gap-y-10">
        <div>
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/favicon/icon.svg"
              alt="assistant-ui"
              width={20}
              height={20}
              className="size-5 dark:hue-rotate-180 dark:invert"
            />
            <span className="text-[15px] font-medium tracking-tight">
              assistant-ui
            </span>
          </Link>
          <p className="mt-3 max-w-sm text-[13px] leading-relaxed text-(--da-ink)/50">
            Diagrammatic is the chart vocabulary of assistant-ui, drawn live
            from the diagrammatic package.
          </p>
          <p className={cn(meta, "mt-6 text-[12px] text-(--da-ink)/35")}>
            © 2026 AgentbaseAI Inc.
          </p>
        </div>
        <div className="flex flex-col items-start gap-5">
          <nav
            aria-label="assistant-ui"
            className={cn(meta, "flex flex-wrap gap-x-6 gap-y-2.5")}
          >
            {LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-(--da-ink)/55 transition-colors hover:text-(--da-red)"
              >
                {link.label}
              </Link>
            ))}
          </nav>
          <div className="flex items-center gap-4">
            <a
              href="https://github.com/assistant-ui/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub"
              className="text-(--da-ink)/45 transition-colors hover:text-(--da-red)"
            >
              <GitHubIcon className="size-4" />
            </a>
            <a
              href="https://discord.gg/S9dwgCNEFs"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Discord"
              className="text-(--da-ink)/45 transition-colors hover:text-(--da-red)"
            >
              <DiscordIcon className="size-4" />
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
