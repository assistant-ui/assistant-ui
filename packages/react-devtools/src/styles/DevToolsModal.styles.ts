import type { CSSProperties } from "react";

export interface DevToolsModalStyles {
  floatingContainer: CSSProperties;
  floatingButton: CSSProperties;
  floatingButtonHover: CSSProperties;
  backdrop: CSSProperties;
  modal: CSSProperties;
  dismissButton: CSSProperties;
  dismissButtonHover: CSSProperties;
  modalContent: CSSProperties;
}

const COLORS = {
  light: {
    primary: "#2563EB",
    background: "#f8fafc",
    surface: "#ffffff",
    text: "#111827",
    textLight: "#6b7280",
    border: "rgba(148, 163, 184, 0.35)",
    shadow: "rgba(37, 99, 235, 0.35)",
    buttonText: "#f9fafb",
    hoverBg: "rgba(148, 163, 184, 0.18)",
  },
  dark: {
    primary: "#111827",
    background: "#09090b",
    surface: "#09090b",
    text: "#e5e7eb",
    textLight: "#9ca3af",
    border: "rgba(63, 63, 70, 0.6)",
    shadow: "rgba(0, 0, 0, 0.55)",
    buttonText: "#e5e7eb",
    hoverBg: "rgba(148, 163, 184, 0.12)",
  },
} as const;

export const getStyles = (darkMode: boolean): DevToolsModalStyles => {
  const theme = darkMode ? COLORS.dark : COLORS.light;

  return {
    floatingContainer: {
      position: "fixed",
      bottom: "24px",
      right: "24px",
      zIndex: 2147483647,
    },
    floatingButton: {
      width: "42px",
      height: "42px",
      borderRadius: "9999px",
      border: "none",
      background: theme.primary,
      color: theme.buttonText,
      cursor: "pointer",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      boxShadow: darkMode
        ? `0 10px 40px ${COLORS.dark.shadow}`
        : `0 10px 40px ${COLORS.light.shadow}`,
      transition: "transform 0.2s ease, box-shadow 0.2s ease",
    },
    floatingButtonHover: {
      transform: "translateY(-2px)",
      boxShadow: darkMode
        ? "0 16px 50px rgba(17, 24, 39, 0.55)"
        : "0 16px 50px rgba(37, 99, 235, 0.45)",
    },
    backdrop: {
      position: "fixed",
      inset: 0,
      background: "rgba(15, 23, 42, 0.45)",
      backdropFilter: "blur(6px)",
      animation: "fadeIn 0.12s ease",
      zIndex: 2147483646,
    },
    modal: {
      position: "fixed",
      top: "50%",
      left: "50%",
      transform: "translate(-50%, -50%)",
      width: "min(960px, 90vw)",
      height: "min(720px, 85vh)",
      background: theme.background,
      borderRadius: "16px",
      border: `1px solid ${theme.border}`,
      boxShadow: darkMode
        ? "0 32px 120px rgba(0, 0, 0, 0.55)"
        : "0 32px 120px rgba(15, 23, 42, 0.35)",
      display: "flex",
      flexDirection: "column",
      overflow: "hidden",
      animation: "slideIn 0.16s ease",
      zIndex: 2147483647,
    },
    dismissButton: {
      alignSelf: "flex-end",
      margin: "10px 12px 0 0",
      background: "transparent",
      border: "none",
      color: theme.textLight,
      cursor: "pointer",
      padding: "6px",
      borderRadius: "6px",
      transition: "background 0.2s ease, color 0.2s ease",
    },
    dismissButtonHover: {
      background: theme.hoverBg,
      color: theme.text,
    },
    modalContent: {
      flex: 1,
      overflow: "hidden",
      position: "relative",
      background: theme.background,
    },
  };
};

export const ANIMATION_STYLES = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideIn {
    from {
      opacity: 0;
      transform: translate(-50%, -48%) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translate(-50%, -50%) scale(1);
    }
  }
`;
