import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ScrollReset } from "@/components/elements/scroll-reset";
import {
  StandaloneMobileNav,
  StandaloneSidebar,
} from "@/components/standalone/sidebar";
import { PageFrame } from "@/components/shared/page-frame";

export default function StandaloneDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageFrame pad="sub">
      <ScrollReset />
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
        <StandaloneSidebar />
        <article className="min-w-0">
          <Link
            href="/standalone"
            className="text-foreground/45 hover:text-foreground/90 inline-flex items-center gap-1.5 text-[13px] transition-colors lg:hidden"
          >
            <ArrowLeftIcon className="size-3.5" />
            Standalone
          </Link>
          <StandaloneMobileNav />
          {children}
        </article>
      </div>
    </PageFrame>
  );
}
