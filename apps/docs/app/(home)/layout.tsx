import { FC, ReactNode } from "react";
import { HomeLayout } from "fumadocs-ui/layouts/home";
import { baseOptions } from "../docs/layout.config";
import Image from "next/image";
import icon from "../../public/favicon/icon.svg";
import Link from "next/link";

export default function Layout({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  return (
    <HomeLayout {...baseOptions}>
      {children}
      <Footer />
    </HomeLayout>
  );
}

function Footer(): React.ReactElement {
  return (
    <footer className="relative border-t px-8 pb-32 pt-20">
      <div className="mx-auto flex w-full max-w-screen-xl flex-col items-start justify-between sm:flex-row">
        <div className="mb-4 mr-4 sm:flex">
          <Link
            className="mr-4 flex items-center gap-2 text-sm font-normal text-black"
            href="/"
          >
            <Image
              src={icon}
              alt="logo"
              className="inline size-4 dark:hue-rotate-180 dark:invert"
            />
            <span className="font-medium text-black dark:text-white">
              assistant-ui
            </span>
          </Link>
        </div>
        <div className="mt-10 grid grid-cols-2 items-start gap-10 sm:mt-0">
          <div className="flex w-[160px] flex-col justify-center gap-4">
            <p className="text-sm">Product</p>
            <FooterLink href="/docs/getting-started">Documentation</FooterLink>
            <FooterLink href="/showcase">Showcase</FooterLink>
            <FooterLink href="/examples">Examples</FooterLink>
            <FooterLink href="/blog">Blog</FooterLink>
          </div>
          <div className="flex flex-col justify-center gap-4">
            <p className="text-sm">Support</p>
            <FooterLink href="https://discord.gg/S9dwgCNEFs">
              Discord
            </FooterLink>
            <FooterLink href="https://github.com/assistant-ui/assistant-ui">
              GitHub
            </FooterLink>
            <FooterLink href="https://cal.com/simon-farshid/assistant-ui">
              Contact Sales
            </FooterLink>
          </div>

          {/* <div className="mt-4 flex flex-col justify-center space-y-4">
            <a
              className="text-muted-foreground hover:text-foreground text-xs transition-colors sm:text-sm"
              href="#"
            >
              Privacy Policy
            </a>
            <a
              className="text-muted-foreground hover:text-foreground text-xs transition-colors sm:text-sm"
              href="#"
            >
              Terms of Service
            </a>
          </div> */}
        </div>
      </div>
    </footer>
  );
}

const FooterLink: FC<{ href: string; children: ReactNode }> = ({
  href,
  children,
}) => {
  return (
    <a
      className="text-muted-foreground hover:text-foreground text-xs transition-colors sm:text-sm"
      href={href}
    >
      {children}
    </a>
  );
};
