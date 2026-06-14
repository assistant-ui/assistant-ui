import type { FC, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { GitHubIcon } from "@/components/icons/github";
import { DiscordIcon } from "@/components/icons/discord";
import { ThemeToggle } from "@/components/shared/theme-toggle";
import { PRODUCTS } from "@/lib/constants";

type FooterLinkItem = {
  label: string;
  href: string;
  external?: boolean;
};

const FOOTER_LINKS: Record<string, FooterLinkItem[]> = {
  Products: [
    {
      label: "Cloud",
      href: "https://cloud.assistant-ui.com/",
      external: true,
    },
    { label: "Playground", href: "/playground" },
    ...PRODUCTS.map((p) => ({
      label: p.label,
      href: p.href,
      ...(p.external && { external: true }),
    })),
  ],
  Resources: [
    { label: "Documentation", href: "/docs" },
    { label: "Examples", href: "/examples" },
    { label: "Showcase", href: "/showcase" },
    { label: "Traction", href: "/traction" },
    { label: "Packages", href: "/packages" },
    { label: "Blog", href: "/blog" },
  ],
  Company: [
    { label: "Careers", href: "/careers" },
    {
      label: "Contact Sales",
      href: "https://cal.com/simon-farshid/assistant-ui",
      external: true,
    },
    { label: "Pricing", href: "/pricing" },
    { label: "Brand", href: "/brand" },
  ],
  Legal: [
    {
      label: "Terms of Service",
      href: "/terms-of-service",
    },
    {
      label: "Privacy Policy",
      href: "/privacy-policy",
    },
  ],
};

export function Footer(): React.ReactElement {
  return (
    <footer className="py-10 md:py-16">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-10 px-4 md:flex-row md:justify-between">
        <div className="grid grid-cols-2 gap-x-12 gap-y-8 sm:grid-cols-4 md:order-2 lg:gap-x-16">
          {Object.entries(FOOTER_LINKS).map(([category, links]) => (
            <div key={category} className="flex flex-col gap-3">
              <p className="text-sm font-medium">{category}</p>
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

        <div className="flex flex-col gap-4 md:order-1">
          <Link href="/" className="flex items-center gap-2">
            <Image
              src="/favicon/icon.svg"
              alt="logo"
              width={24}
              height={24}
              className="size-6 dark:hue-rotate-180 dark:invert"
            />
            <span className="text-xl font-medium">assistant-ui</span>
          </Link>

          <div className="flex items-center gap-3">
            <a
              href="https://x.com/assistantui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="X (Twitter)"
            >
              <svg
                aria-hidden="true"
                className="size-5"
                viewBox="0 0 24 24"
                fill="currentColor"
              >
                <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
              </svg>
            </a>
            <a
              href="https://github.com/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="GitHub"
            >
              <GitHubIcon className="size-5" />
            </a>
            <a
              href="https://discord.gg/S9dwgCNEFs"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground transition-colors"
              aria-label="Discord"
            >
              <DiscordIcon className="size-5" />
            </a>
          </div>

          <div className="mt-auto flex flex-col gap-3">
            <div className="-ml-2">
              <ThemeToggle />
            </div>
            <a
              href="https://agentbase.dev"
              target="_blank"
              rel="noopener noreferrer"
              className="text-muted-foreground hover:text-foreground text-sm transition-colors"
            >
              &copy; {new Date().getFullYear()} AgentbaseAI Inc.
            </a>
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
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-sm transition-colors"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
      >
        {children}
        <ArrowUpRight className="size-3 opacity-40" />
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
