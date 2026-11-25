import { cn } from "@/lib/utils";

/** The made-up person every demo signs in as, so no real name appears in a demo. */
export const DEMO_PERSON = {
  name: "Juniper Hale",
  initial: "J",
  email: "juniper@example.com",
} as const;

export function PersonAvatar({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium text-white",
        className,
      )}
      style={{ background: "linear-gradient(135deg, #0f766e, #65a30d)" }}
    >
      {DEMO_PERSON.initial}
    </span>
  );
}
