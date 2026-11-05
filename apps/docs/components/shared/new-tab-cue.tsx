import { ArrowUpRight } from "lucide-react";

export function NewTabCue() {
  return (
    <>
      <ArrowUpRight aria-hidden data-icon="inline-end" />{" "}
      <span className="sr-only">(opens in a new tab)</span>
    </>
  );
}
