"use client";

import { unsplash } from "./pattern-picker";

export function DemoArea({
  children,
  pattern,
}: {
  children: React.ReactNode;
  pattern: string;
}) {
  return (
    <div
      className="relative overflow-hidden transition-[background-image] duration-500"
      style={{
        backgroundImage: unsplash(pattern),
        backgroundAttachment: "fixed",
        backgroundSize: "cover",
        backgroundPosition: "center",
      }}
    >
      {children}
    </div>
  );
}

export function GlassDemo({
  className,
  label,
  compact = false,
}: {
  className: string;
  label?: string;
  compact?: boolean;
}) {
  return (
    <div
      className={`rounded-xl ${className} ${compact ? "px-4 py-6" : "p-6"}`}
      style={{ minHeight: compact ? 80 : 100 }}
    >
      {label && (
        <code className="flex items-center justify-center font-mono text-primary leading-8">
          {label}
        </code>
      )}
    </div>
  );
}
