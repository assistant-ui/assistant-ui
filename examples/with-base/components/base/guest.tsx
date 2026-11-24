"use client";

import { createContext, useContext, type ReactNode } from "react";
import { cn } from "@/lib/utils";
import type { Guest } from "@/lib/guest";

const GuestContext = createContext<Guest | null>(null);

/** Hands the guest the layout read from the session cookie to the app. */
export function GuestProvider({
  guest,
  children,
}: {
  guest: Guest;
  children: ReactNode;
}) {
  return (
    <GuestContext.Provider value={guest}>{children}</GuestContext.Provider>
  );
}

export function useGuest() {
  const guest = useContext(GuestContext);
  if (!guest) throw new Error("useGuest must be used within <GuestProvider>.");
  return guest;
}

/** The guest's initials on their own gradient. 24px unless sized. */
export function GuestAvatar({
  guest,
  className,
}: {
  guest: Guest;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={cn(
        "flex size-6 shrink-0 items-center justify-center rounded-full text-[0.625rem] font-semibold text-white",
        className,
      )}
      style={{
        backgroundImage: `linear-gradient(135deg, oklch(0.72 0.15 ${guest.hue}), oklch(0.55 0.17 ${(guest.hue + 50) % 360}))`,
      }}
    >
      {guest.initials}
    </span>
  );
}
