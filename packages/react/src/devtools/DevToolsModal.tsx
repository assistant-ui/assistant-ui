"use client";

import { useState, useEffect } from "react";
import { DevToolsUI } from "./DevToolsUI";
import { DevToolsHooks } from "./DevToolsHooks";

const isDarkMode = (): boolean => {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark")
  );
};

export const DevToolsModal = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(isDarkMode());
  const [buttonHover, setButtonHover] = useState(false);
  const [closeHover, setCloseHover] = useState(false);
  const [eventCount, setEventCount] = useState(0);

  // Add animations to the document
  useEffect(() => {
    const styleId = "devtools-modal-animations";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = `
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
      document.head.appendChild(style);
    }

    return () => {
      const style = document.getElementById(styleId);
      if (style && !document.querySelector("[data-devtools-modal]")) {
        style.remove();
      }
    };
  }, []);

  useEffect(() => {
    const checkDarkMode = () => setDarkMode(isDarkMode());

    const observer = new MutationObserver(checkDarkMode);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["class"],
    });
    if (document.body !== document.documentElement) {
      observer.observe(document.body, {
        attributes: true,
        attributeFilter: ["class"],
      });
    }

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const devTools = DevToolsHooks.getInstance();

    const unsubscribe = devTools.subscribeToAllEvents(() => {
      let totalCount = 0;
      for (const [_, logs] of devTools.getAllEventLogs()) {
        totalCount += logs.length;
      }
      setEventCount(totalCount);
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!isOpen) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  const styles = getStyles(darkMode);

  return (
    <>
      <div style={styles.floatingContainer}>
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          style={{
            ...styles.floatingButton,
            ...(buttonHover ? styles.floatingButtonHover : {})
          }}
          aria-label="Open Assistant UI DevTools"
          title="Open Assistant UI DevTools"
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "100%", height: "100%" }}
          >
            <path
              d="M7 8L3 12L7 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M17 8L21 12L17 16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M14 4L10 20"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
        {eventCount > 0 && !isOpen && (
          <div style={styles.badge}>
            {eventCount > 99 ? "99+" : eventCount}
          </div>
        )}
      </div>

      {isOpen && (
        <>
          <div style={styles.backdrop} onClick={() => setIsOpen(false)} />

          <div style={styles.modal} data-devtools-modal>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Assistant UI DevTools</h2>
              <button
                onClick={() => setIsOpen(false)}
                onMouseEnter={() => setCloseHover(true)}
                onMouseLeave={() => setCloseHover(false)}
                style={{
                  ...styles.closeButton,
                  ...(closeHover ? styles.closeButtonHover : {})
                }}
                aria-label="Close DevTools"
              >
                <svg
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M18 6L6 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M6 6L18 18"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </div>

            <div style={styles.modalContent}>
              <DevToolsUI darkModeProp={darkMode} />
            </div>
          </div>
        </>
      )}
    </>
  );
};

interface Styles {
  floatingContainer: React.CSSProperties;
  floatingButton: React.CSSProperties;
  badge: React.CSSProperties;
  floatingButtonHover: React.CSSProperties;
  backdrop: React.CSSProperties;
  modal: React.CSSProperties;
  modalHeader: React.CSSProperties;
  modalTitle: React.CSSProperties;
  closeButton: React.CSSProperties;
  closeButtonHover: React.CSSProperties;
  modalContent: React.CSSProperties;
}

const getStyles = (darkMode: boolean): Styles => ({
  floatingContainer: {
    position: "fixed" as const,
    bottom: "20px",
    right: "20px",
    zIndex: 9998,
  },
  floatingButton: {
    width: "48px",
    height: "48px",
    borderRadius: "8px",
    background: darkMode ? "#0a0a0a" : "#000000",
    border: darkMode ? "1px solid #333" : "1px solid #222",
    color: darkMode ? "#10b981" : "#22c55e",
    cursor: "pointer" as const,
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    boxShadow: darkMode
      ? "0 2px 8px rgba(0, 0, 0, 0.5), 0 1px 2px rgba(0, 0, 0, 0.3)"
      : "0 2px 8px rgba(0, 0, 0, 0.3), 0 1px 2px rgba(0, 0, 0, 0.2)",
    transition: "all 0.2s",
    padding: "10px",
  },
  badge: {
    position: "absolute" as const,
    top: "-6px",
    right: "-6px",
    background: darkMode ? "#dc2626" : "#ef4444",
    color: "white",
    borderRadius: "10px",
    padding: "1px 6px",
    fontSize: "10px",
    fontWeight: 600 as const,
    minWidth: "20px",
    textAlign: "center" as const,
    boxShadow: "0 1px 3px rgba(0, 0, 0, 0.3)",
    border: darkMode ? "1px solid #0a0a0a" : "1px solid #000",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  floatingButtonHover: {
    transform: "scale(1.05)",
    boxShadow: darkMode
      ? "0 4px 12px rgba(0, 0, 0, 0.6), 0 2px 4px rgba(0, 0, 0, 0.4)"
      : "0 4px 12px rgba(0, 0, 0, 0.4), 0 2px 4px rgba(0, 0, 0, 0.3)",
    borderColor: darkMode ? "#444" : "#333",
    color: darkMode ? "#34d399" : "#4ade80",
  },
  backdrop: {
    position: "fixed" as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    background: "rgba(0, 0, 0, 0.5)",
    zIndex: 9999,
    animation: "fadeIn 0.2s ease-in-out",
  },
  modal: {
    position: "fixed" as const,
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90vw",
    maxWidth: "1200px",
    height: "80vh",
    background: darkMode ? "#0a0a0a" : "white",
    borderRadius: "12px",
    boxShadow: "0 20px 60px rgba(0, 0, 0, 0.3)",
    zIndex: 10000,
    display: "flex" as const,
    flexDirection: "column" as const,
    animation: "slideIn 0.3s ease-out",
    overflow: "hidden",
  },
  modalHeader: {
    padding: "16px 20px",
    borderBottom: `1px solid ${darkMode ? "#262626" : "#e5e5e5"}`,
    display: "flex" as const,
    justifyContent: "space-between" as const,
    alignItems: "center" as const,
    background: darkMode ? "#171717" : "#f9f9f9",
  },
  modalTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: 600 as const,
    color: darkMode ? "#e5e5e5" : "#1a1a1a",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Consolas, "Liberation Mono", Menlo, monospace',
  },
  closeButton: {
    background: "transparent",
    border: "none",
    color: darkMode ? "#a3a3a3" : "#737373",
    cursor: "pointer" as const,
    padding: "8px",
    display: "flex" as const,
    alignItems: "center" as const,
    justifyContent: "center" as const,
    borderRadius: "4px",
    transition: "background 0.2s",
  },
  closeButtonHover: {
    background: darkMode ? "#262626" : "#e5e5e5",
  },
  modalContent: {
    flex: 1,
    overflow: "hidden",
    position: "relative" as const,
  },
});