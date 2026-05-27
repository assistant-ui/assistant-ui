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
        className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1.5 text-sm transition-colors"
      >
        <ArrowLeft className="size-4" />
        Back to Examples
      </Link>
    </nav>
  );
}
