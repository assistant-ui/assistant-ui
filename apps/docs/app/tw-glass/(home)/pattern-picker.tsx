"use client";

export const unsplash = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=1920&q=90)`;

export const unsplashThumb = (id: string) =>
  `url(https://images.unsplash.com/${id}?auto=format&fit=crop&w=88&h=88&q=60)`;

export const PATTERNS = [
  { name: "ee4344e4e", id: "photo-1761419647919-233829f0f469" },
  { name: "Hands", id: "photo-1541661538396-53ba2d051eed" },
  { name: "Fern", id: "photo-1557672172-298e090bd0f1" },
  { name: "Abstract", id: "photo-1604871000636-074fa5117945" },
  { name: "ee44e", id: "photo-1640280882428-547d0afe0c8d" },
  { name: "ee4e4e", id: "photo-1541661538396-53ba2d051eed" },
  { name: "ee4345g44e4e", id: "photo-1517384084767-6bc118943770" },
];

export function PatternPicker({
  active,
  onChange,
}: {
  active: number;
  onChange: (index: number) => void;
}) {
  return (
    <div className="fixed inset-x-0 bottom-6 z-50 flex justify-center">
      <div className="glass glass-surface flex gap-2 rounded-2xl p-2">
        {PATTERNS.map((p, i) => (
          <button
            key={p.name}
            type="button"
            onClick={() => onChange(i)}
            aria-label={p.name}
            title={p.name}
            className={`size-11 cursor-pointer overflow-hidden rounded-xl bg-muted transition-all ${
              active === i
                ? "ring-2 ring-foreground/40 ring-offset-2 ring-offset-background"
                : "opacity-70 hover:opacity-100"
            }`}
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
