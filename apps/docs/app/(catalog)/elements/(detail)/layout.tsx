import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ElementsSidebar } from "@/components/pages/elements/elements-sidebar";
import { ScrollReset } from "@/components/pages/elements/scroll-reset";
import { PageFrame } from "@/components/shared/page-frame";

export default function ElementDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <PageFrame pad="sub">
      <ScrollReset />
      <div className="lg:grid lg:grid-cols-[13rem_minmax(0,1fr)] lg:gap-12">
        <ElementsSidebar />
        <article className="min-w-0">
          <Link
            href="/elements"
            className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-[13px] transition-colors lg:hidden"
          >
            <ArrowLeftIcon className="size-3.5" />
            Elements
          </Link>
          {children}
        </article>
      </div>
    </PageFrame>
  );
}
