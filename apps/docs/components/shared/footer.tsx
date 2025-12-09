import type { FC, ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

export function Footer(): React.ReactElement {
  return (
    <footer className="relative px-8 py-18">
      <div className="mx-auto flex w-full max-w-7xl flex-col justify-between sm:flex-row">
        <div className="mr-4 flex flex-col gap-4">
          <Link
            className="mr-4 flex items-center gap-3 font-normal text-black text-sm"
            href="/"
          >
            <Image
              src="/favicon/icon.svg"
              alt="logo"
              width={28}
              height={28}
              className="inline size-7 dark:hue-rotate-180 dark:invert"
            />
            <span className="font-medium text-2xl text-black dark:text-white">
              assistant-ui
            </span>
          </Link>
          <div className="flex gap-4">
            <Link
              href="https://x.com/assistantui"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/logos/x.svg"
                alt="X icon"
                width={20}
                height={20}
                className="inline size-5 opacity-30 transition-opacity hover:opacity-100 dark:hue-rotate-180 dark:invert"
              />
            </Link>
            <Link
              href="https://github.com/assistant-ui"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/logos/github.svg"
                alt="GitHub icon"
                width={20}
                height={20}
                className="inline size-5 opacity-30 transition-opacity hover:opacity-100 dark:hue-rotate-180 dark:invert"
              />
            </Link>
            <Link
              href="https://discord.gg/S9dwgCNEFs"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Image
                src="/logos/discord.svg"
                alt="Discord icon"
                width={20}
                height={20}
                className="inline size-5 opacity-30 transition-opacity hover:opacity-100 dark:hue-rotate-180 dark:invert"
              />
            </Link>
          </div>
          <div className="flex-grow" />
          <p className="text-foreground/30 text-sm">
            &copy; {new Date().getFullYear()} AgentbaseAI Inc.
          </p>
        </div>
        <div className="mt-10 grid grid-cols-3 items-start gap-10 sm:mt-0">
          <div className="flex w-[160px] flex-col justify-center gap-4">
            <p className="text-sm">Product</p>
            <FooterLink href="/docs/getting-started">Documentation</FooterLink>
            <FooterLink href="/showcase">Showcase</FooterLink>
            <FooterLink href="/examples">Examples</FooterLink>
            <FooterLink href="/pricing">Pricing</FooterLink>
          </div>
          <div className="flex w-[160px] flex-col justify-center gap-4">
            <p className="text-sm">Packages</p>
            <FooterLink href="/docs/getting-started">assistant-ui</FooterLink>
            <FooterLink href="/tw-shimmer">tw-shimmer</FooterLink>
            <FooterLink href="/safe-content-frame">
              safe-content-frame
            </FooterLink>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="text-sm">Company</p>
            <FooterLink href="/careers">Careers</FooterLink>
            <FooterLink href="https://cal.com/simon-farshid/assistant-ui">
              Contact Sales
            </FooterLink>
            <FooterLink href="/blog">Blog</FooterLink>
            <FooterLink href="https://docs.google.com/document/d/1EhtzGCVOFGtDWaRP7uZ4gBpDVzUfuCF23U6ztRunNRo/view">
              Terms of Service
            </FooterLink>
            <FooterLink href="https://docs.google.com/document/d/1rTuYeC2xJHWB5u42dSyWwp3vBx7Cms5b6sK971wraVY/view">
              Privacy Policy
            </FooterLink>
          </div>
        </div>
      </div>
    </footer>
  );
}

const FooterLink: FC<{ href: string; children: ReactNode }> = ({
  href,
  children,
}) => {
  const isExternal = href.startsWith("http");

  return (
    <a
      className="text-muted-foreground text-xs transition-colors hover:text-foreground sm:text-sm"
      href={href}
      {...(isExternal && { target: "_blank", rel: "noopener noreferrer" })}
    >
      {children}
    </a>
  );
};
