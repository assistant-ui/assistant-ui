import type { FC, ReactNode } from "react";
import Link from "next/link";
import { DiscordIcon } from "@/components/icons/discord";
import { GitHubIcon } from "@/components/icons/github";
import { CookieSettingsLink } from "@/components/cookie-settings-link";
import { StatusBadge } from "@/components/shared/status-badge";
import { ThemeToggle } from "@/components/shared/theme-toggle";

type FooterLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

const FOOTER_LINKS: Record<string, FooterLinkItem[]> = {
  Library: [
    { label: "Docs", href: "/docs" },
    { label: "Changelog", href: "/changelog" },
    { label: "Playground", href: "/playground" },
  ],
  Platforms: [
    { label: "React", href: "/docs" },
    { label: "React Native", href: "/native" },
    { label: "Ink", href: "/ink" },
  ],
  Extend: [
    { label: "Elements", href: "/elements" },
    { label: "Design", href: "/design" },
    { label: "Cloud AI SDK", href: "/cloud-ai-sdk" },
  ],
  Primitives: [
    { label: "tw-shimmer", href: "/tw-shimmer" },
    { label: "tw-glass", href: "/tw-glass" },
    { label: "Heat Graph", href: "/heat-graph" },
    { label: "Safe Content Frame", href: "/safe-content-frame" },
    { label: "react-o11y", href: "/react-o11y" },
  ],
  Resources: [
    { label: "Examples", href: "/examples" },
    { label: "Showcase", href: "/showcase" },
    { label: "Open source", href: "/oss" },
    { label: "Packages", href: "/packages" },
  ],
  Company: [
    { label: "Blog", href: "/blog" },
    { label: "Careers", href: "/careers" },
    { label: "Brand", href: "/brand" },
    { label: "Traction", href: "/traction" },
    { label: "Pricing", href: "/pricing" },
  ],
};

export function Footer(): React.ReactElement {
  return (
    <footer className="rounded-page py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4">
        <div className="grid grid-cols-2 gap-x-8 gap-y-8 sm:grid-cols-3 lg:grid-cols-6">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3">
              <p className="text-muted-foreground font-mono text-[11px] font-medium tracking-wide uppercase">
                {category}
              </p>
              {links.map((link) => (
                <FooterLink
                  key={link.href}
                  href={link.href}
                  {...(link.external && { external: true })}
                >
                  {link.label}
                </FooterLink>
              ))}
            </div>
          ))}
        </div>

        <div className="text-muted-foreground flex flex-col gap-3 border-t pt-6 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <a
              href="https://agentbase.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-foreground transition-colors"
            >
              &copy; {new Date().getFullYear()} AgentbaseAI Inc.
            </a>
            <span aria-hidden>·</span>
            <FooterLink href="/privacy-policy">Privacy</FooterLink>
            <span aria-hidden>·</span>
            <FooterLink href="/terms-of-service">Terms</FooterLink>
            <CookieSettingsLink separator />
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <StatusBadge />
            <div className="flex flex-wrap items-center gap-1.5">
              <a
                href="https://x.com/assistantui"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground flex size-7 items-center justify-center transition-colors"
                aria-label="X (Twitter)"
              >
                <svg
                  aria-hidden="true"
                  className="size-4"
                  viewBox="0 0 24 24"
                  fill="currentColor"
                >
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>
              <a
                href="https://github.com/assistant-ui/assistant-ui"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground flex size-7 items-center justify-center transition-colors"
                aria-label="GitHub"
              >
                <GitHubIcon className="size-4" />
              </a>
              <a
                href="https://discord.gg/S9dwgCNEFs"
                target="_blank"
                rel="noopener noreferrer"
                className="hover:text-foreground flex size-7 items-center justify-center transition-colors"
                aria-label="Discord"
              >
                <DiscordIcon className="size-4" />
              </a>
              <ThemeToggle className="hover:text-foreground" />
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}

const FooterLink: FC<{
  href: string;
  external?: boolean;
  children: ReactNode;
}> = ({ href, external, children }) => {
  const isExternal = external ?? href.startsWith("http");

  if (isExternal) {
    return (
      <a
        className="text-muted-foreground hover:text-foreground text-sm transition-colors"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
      </a>
    );
  }

  return (
    <Link
      className="text-muted-foreground hover:text-foreground text-sm transition-colors"
      href={href}
    >
      {children}
    </Link>
  );
};
