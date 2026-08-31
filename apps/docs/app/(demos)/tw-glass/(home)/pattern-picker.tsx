"use client";

import { cn } from "@/lib/utils";

export const unsplash = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=90)`;

export const unsplashThumb = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=88&h=88&q=60)`;

export const PATTERNS = [
  { name: "Marble", id: "photo-1761419647919-233829f0f469" },
  { name: "Hands", id: "photo-1541661538396-53ba2d051eed" },
  { name: "Fern", id: "photo-1557672172-298e090bd0f1" },
  { name: "Abstract", id: "photo-1604871000636-074fa5117945" },
  { name: "Gradient", id: "photo-1640280882428-547d0afe0c8d" },
  { name: "Sunset", id: "photo-1517384084767-6bc118943770" },
];

export function PatternPicker({
  active,
  onChange,
}: {
  active: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="flex items-center gap-3">
      <span className="text-muted-foreground/70 font-mono text-[11px] tracking-wide">
        behind the glass
      </span>
      <div className="flex gap-1.5">
        {PATTERNS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange(i)}
            aria-label={p.name}
            title={p.name}
            className={cn(
              "size-7 cursor-pointer overflow-hidden border transition-all",
              active === i
                ? "border-foreground/60"
                : "border-foreground/10 opacity-60 hover:opacity-100",
            )}
            style={{
              backgroundImage: unsplashThumb(p.id),
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          />
        ))}
      </div>
    </div>
  );
}
