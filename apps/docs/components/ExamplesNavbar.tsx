"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { usePathname } from "next/navigation";

export function ExamplesNavbar() {
  const pathname = usePathname();
  const isChildPage = pathname !== "/examples";

  return (
    <div className="mx-auto flex max-w-7xl items-center justify-between px-4 pt-4 pb-3">
      {isChildPage && (
        <Button asChild size="sm" variant="ghost">
          <Link href="/examples">← Back to Examples</Link>
        </Button>
      )}
    </div>
  );
}
