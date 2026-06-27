import { Children } from "react";

const TONE_STYLES: Record<string, { container: string; dot: string }> = {
  info: { container: "bg-blue-500/8 border-blue-500/25", dot: "bg-blue-500" },
  success: {
    container: "bg-emerald-500/8 border-emerald-500/25",
    dot: "bg-emerald-500",
  },
  warning: {
    container: "bg-amber-500/8 border-amber-500/25",
    dot: "bg-amber-500",
  },
  danger: { container: "bg-red-500/8 border-red-500/25", dot: "bg-red-500" },
};

export function StyledAlert({
  title,
  description,
  tone,
  children,
}: {
  title?: string;
  description?: string;
  tone?: string;
  children?: React.ReactNode;
}) {
  const style = TONE_STYLES[tone ?? "info"] ?? TONE_STYLES.info!;
  return (
    <div className={`flex gap-3 rounded-xl border p-4 ${style.container}`}>
      <div
        className={`mt-1.5 h-2 w-2 flex-shrink-0 rounded-full ${style.dot}`}
      />
      <div className="flex flex-col gap-1">
        {title ? (
          <span className="text-foreground text-sm font-semibold">{title}</span>
        ) : null}
        {description ? (
          <span className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </span>
        ) : null}
        {children}
      </div>
    </div>
  );
}

const MAX_CARDS = 10;

export function StyledCarousel({ children }: { children?: React.ReactNode }) {
  const cards = Children.toArray(children).slice(0, MAX_CARDS);
  return (
    <div className="flex [scrollbar-width:thin] gap-4 overflow-x-auto pb-2">
      {cards.map((card, i) => (
        <div key={i} className="min-w-[280px] flex-shrink-0">
          {card}
        </div>
      ))}
    </div>
  );
}
