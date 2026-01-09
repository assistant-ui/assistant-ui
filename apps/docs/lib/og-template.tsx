import type { ReactNode } from "react";

export const OG_SIZE = {
  width: 1200,
  height: 630,
};

/** The assistant-ui chat bubble logo as JSX for OG images */
export function OgLogo({
  size = 64,
  color = "white",
}: {
  size?: number;
  color?: string;
}) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="6" fill="#000000" />
      <g
        transform="translate(4,4)"
        fill="black"
        stroke={color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M14 9a2 2 0 0 1-2 2H6l-4 4V4c0-1.1.9-2 2-2h8a2 2 0 0 1 2 2z" />
        <path d="M18 9h2a2 2 0 0 1 2 2v11l-4-4h-6a2 2 0 0 1-2-2v-1" />
      </g>
    </svg>
  );
}

/** Shared header with logo on left and URL on right */
export function OgHeader({
  fontSans = "Geist",
  fontMono = "GeistMono",
  subtle = false,
}: {
  fontSans?: string;
  fontMono?: string;
  /** Use smaller, more muted branding for sub-projects */
  subtle?: boolean;
}) {
  const logoSize = subtle ? 40 : 64;
  const titleSize = subtle ? 28 : 44;
  const urlSize = subtle ? 22 : 32;
  const titleColor = subtle ? "#888888" : "#e5e5e5";
  const urlColor = subtle ? "#666666" : "#a3a3a3";
  const gap = subtle ? 12 : 20;

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap,
        }}
      >
        <OgLogo size={logoSize} color={titleColor} />
        <span
          style={{
            fontSize: titleSize,
            fontWeight: 500,
            color: titleColor,
            fontFamily: fontSans,
            letterSpacing: "-0.01em",
          }}
        >
          assistant-ui
        </span>
      </div>
      <span
        style={{
          fontSize: urlSize,
          fontWeight: 400,
          color: urlColor,
          fontFamily: fontMono,
        }}
      >
        assistant-ui.com
      </span>
    </div>
  );
}

/**
 * Reusable OG image template with header, centered content, and optional background decoration.
 */
export function OgTemplate({
  children,
  backgroundDecoration,
  subtleBranding = false,
}: {
  children: ReactNode;
  backgroundDecoration?: ReactNode;
  /** Use smaller, more muted assistant-ui branding for sub-projects */
  subtleBranding?: boolean;
}) {
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        backgroundColor: "#0a0a0a",
        padding: "60px 60px 90px 60px",
        position: "relative",
      }}
    >
      {backgroundDecoration && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {backgroundDecoration}
        </div>
      )}

      <OgHeader subtle={subtleBranding} />

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          justifyContent: "center",
          alignItems: "center",
          gap: 24,
          zIndex: 1,
        }}
      >
        {children}
      </div>
    </div>
  );
}
