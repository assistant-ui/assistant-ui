import { cn } from "@/lib/utils";
import { anno } from "./atlas";

export function FrameworkToggle() {
  return (
    <div
      role="group"
      aria-label="Framework"
      className={cn(anno, "flex items-stretch border border-(--da-line)")}
    >
      <span
        aria-current="true"
        className="bg-(--da-ink) px-3 py-1.5 text-(--da-paper)"
      >
        React
      </span>
      <button
        type="button"
        disabled
        title="Vue is on the way"
        className="cursor-not-allowed px-3 py-1.5 text-(--da-ink)/30"
      >
        Vue
      </button>
    </div>
  );
}
