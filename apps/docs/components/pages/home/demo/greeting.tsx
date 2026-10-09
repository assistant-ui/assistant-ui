"use client";

import type { ReactNode } from "react";
import { typeSection } from "@/components/shared/type";
import { useSession } from "@/lib/session";

function firstName(name: string): string {
  return name.trim().split(/\s+/)[0] || name;
}

export function Greeting(): ReactNode {
  const session = useSession();

  return (
    <div className="animate-in fade-in slide-in-from-bottom-1 mx-auto mb-8 flex w-full max-w-(--thread-max-width) flex-col items-center text-center duration-200">
      <p className={typeSection}>
        {session.status === "signed-in"
          ? `Welcome back, ${firstName(session.user.name)}.`
          : "How can I help you today?"}
      </p>
    </div>
  );
}
