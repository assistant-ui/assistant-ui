"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft } from "lucide-react";

export function ExamplesNavbar() {
  const pathname = usePathname();
  const isChildPage = pathname !== "/examples";

  if (!isChildPage) return null;

  return (
    <nav>
      <Link
        href="/examples"
        className="inline-flex items-center gap-1.5 text-muted-foreground text-sm transition-colors hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Back to Examples
      </Link>
    </nav>
  );
}
