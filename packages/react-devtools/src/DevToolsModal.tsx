"use client";

import { useEffect, useMemo, useState, useSyncExternalStore } from "react";
import { DevToolsFrame } from "./DevToolsFrame";
import { getStyles, ANIMATION_STYLES } from "./styles/DevToolsModal.styles";

const isDarkMode = (): boolean => {
  if (typeof document === "undefined") return false;
  return (
    document.documentElement.classList.contains("dark") ||
    document.body.classList.contains("dark")
  );
};

const subscribeToThemeChanges = (callback: () => void) => {
  if (typeof MutationObserver === "undefined") {
    return () => {};
  }

  const observer = new MutationObserver(callback);

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
};

const DevToolsModalImpl = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [buttonHover, setButtonHover] = useState(false);
  const [closeHover, setCloseHover] = useState(false);

  const darkMode = useSyncExternalStore(
    subscribeToThemeChanges,
    isDarkMode,
    () => false, // Server-side always returns false
  );

  const styles = useMemo(() => getStyles(darkMode), [darkMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;

    const styleId = "devtools-modal-animations";
    if (!document.getElementById(styleId)) {
      const style = document.createElement("style");
      style.id = styleId;
      style.textContent = ANIMATION_STYLES;
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
    if (!isOpen) return;

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("keydown", handleEscape);
    return () => document.removeEventListener("keydown", handleEscape);
  }, [isOpen]);

  return (
    <>
      <div style={styles.floatingContainer}>
        <button
          onClick={() => setIsOpen(true)}
          onMouseEnter={() => setButtonHover(true)}
          onMouseLeave={() => setButtonHover(false)}
          style={{
            ...styles.floatingButton,
            ...(buttonHover ? styles.floatingButtonHover : {}),
          }}
          aria-label="Open assistant-ui DevTools"
          title="Open assistant-ui DevTools"
        >
          <svg
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            style={{ width: "20px", height: "20px" }}
          >
            <path
              d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
          </svg>
        </button>
      </div>

      {isOpen && (
        <>
          <div style={styles.backdrop} onClick={() => setIsOpen(false)} />

          <div style={styles.modal} data-devtools-modal>
            <button
              onClick={() => setIsOpen(false)}
              onMouseEnter={() => setCloseHover(true)}
              onMouseLeave={() => setCloseHover(false)}
              style={{
                ...styles.dismissButton,
                ...(closeHover ? styles.dismissButtonHover : {}),
              }}
              aria-label="Close DevTools"
            >
              <svg
                width="14"
                height="14"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M18 6L6 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M6 6L18 18"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>

            <div style={styles.modalContent}>
              <DevToolsFrame
                style={{
                  width: "100%",
                  height: "100%",
                  border: "none",
                  borderRadius: "12px",
                  backgroundColor: "transparent",
                }}
              />
            </div>
          </div>
        </>
      )}
    </>
  );
};

// Export a component that only renders in development
export const DevToolsModal = () => {
  // Check if we're in production - most bundlers will replace process.env.NODE_ENV
  // This allows the entire component to be eliminated via dead code elimination
  if (
    typeof process !== "undefined" &&
    process.env?.["NODE_ENV"] === "production"
  ) {
    return null;
  }

  return <DevToolsModalImpl />;
};
