export function Typed({ children }: { children: string }) {
  return (
    <span className="text-foreground font-mono text-[12.5px] whitespace-nowrap [font-variant-ligatures:none]">
      {children}
    </span>
  );
}
