"use client";

import { usePathname } from "next/navigation";
import { type ReactNode } from "react";
import { cn } from "@/lib/utils";

function useMode(): string | undefined {
  const name = usePathname();
  return name.split("/")[1];
}

export function Body({
  children,
}: {
  children: ReactNode;
}): React.ReactElement {
  const mode = useMode();

  return (
    <body className={cn("mode-" + mode, "flex min-h-screen flex-col")}>
      {children}
    </body>
  );
}
