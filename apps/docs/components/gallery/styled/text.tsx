export function StyledHeader({
  text,
  size,
  children,
}: {
  text: string;
  size?: string;
  children?: React.ReactNode;
}) {
  const sizes: Record<string, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
  };
  return (
    <h2 className={`font-semibold tracking-tight ${sizes[size ?? "lg"]!}`}>
      {text}
      {children}
    </h2>
  );
}

export function StyledText({
  value,
  size,
  weight,
  color,
  children,
}: {
  value: string;
  size?: string;
  weight?: string;
  color?: string;
  children?: React.ReactNode;
}) {
  const sizes: Record<string, string> = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl",
    "2xl": "text-2xl",
    "3xl": "text-3xl",
    "4xl": "text-4xl",
  };
  const weights: Record<string, string> = {
    normal: "font-normal",
    medium: "font-medium",
    semibold: "font-semibold",
    bold: "font-bold",
  };
  const colors: Record<string, string> = {
    emphasis: "text-foreground",
    secondary: "text-muted-foreground",
    "alpha-70": "text-foreground/70",
    white: "text-white",
    "white-70": "text-white/70",
    "white-50": "text-white/50",
  };
  return (
    <span
      className={`${sizes[size ?? "md"]!} ${weights[weight ?? "normal"]!} ${colors[color ?? "emphasis"]!} leading-relaxed`}
    >
      {value}
      {children}
    </span>
  );
}

export function StyledCaption({
  value,
  children,
}: {
  value: string;
  children?: React.ReactNode;
}) {
  return (
    <span className="text-xs leading-relaxed text-current/60">
      {value}
      {children}
    </span>
  );
}
