import { cn } from "@/lib/utils";
import { meta } from "./atlas";

export function FrameworkToggle() {
  return (
    <div
      role="group"
      aria-label="Framework"
      className={cn(
        meta,
        "flex items-stretch border border-(--da-line) text-[12px]",
      )}
    >
      <span
        aria-current="true"
        className="bg-(--da-ink) px-3 py-1 text-(--da-paper)"
      >
        React
      </span>
      <button
        type="button"
        disabled
        title="Vue is on the way"
        className="cursor-not-allowed px-3 py-1 text-(--da-ink)/30"
      >
        Vue
      </button>
    </div>
  );
}
