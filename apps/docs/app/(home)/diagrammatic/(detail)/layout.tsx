import Link from "next/link";
import { ArrowLeftIcon } from "lucide-react";
import { ChartSidebar } from "@/components/diagrammatic/chart-sidebar";
import { ScrollReset } from "@/components/elements/scroll-reset";

export default function DiagrammaticDetailLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <main className="mx-auto w-full max-w-6xl px-4 pt-20 pb-32 md:pt-24">
      <ScrollReset />
      <div className="lg:grid lg:grid-cols-[210px_minmax(0,1fr)] lg:gap-14">
        <ChartSidebar />
        <article className="min-w-0">
          <Link
            href="/diagrammatic"
            className="text-foreground/45 hover:text-foreground/90 inline-flex items-center gap-1.5 text-[13px] transition-colors lg:hidden"
          >
            <ArrowLeftIcon className="size-3.5" />
            Diagrammatic
          </Link>
          {children}
        </article>
      </div>
    </main>
  );
}
