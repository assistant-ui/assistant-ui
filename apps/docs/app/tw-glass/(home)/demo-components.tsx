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
}: {
  className: string;
  label?: string;
}) {
  return (
    <div className={`flex min-h-44 items-center justify-center ${className}`}>
      {label && (
        <code className="flex items-center justify-center font-mono text-primary text-shadow-sm text-xl">
          {label}
        </code>
      )}
    </div>
  );
}
