"use client";

import { useEffect, useRef, type CSSProperties, type ReactNode } from "react";
import { createRoot, type Root } from "react-dom/client";
import { panelCss } from "../styles/panel.generated";

const PROPERTY_STYLE_ID = "assistant-ui-devtools-properties";

/**
 * Tailwind registers typed `@property --tw-*` custom properties. These register
 * globally and are unreliable when declared only inside a shadow root, so a copy
 * is hoisted to the document head once. The rest of the sheet stays scoped to
 * the shadow root.
 */
const hoistAtProperties = () => {
  if (document.getElementById(PROPERTY_STYLE_ID)) return;
  const rules = panelCss.match(/@property\s+--[^{]+\{[^}]*\}/g);
  if (!rules?.length) return;
  const style = document.createElement("style");
  style.id = PROPERTY_STYLE_ID;
  style.textContent = rules.join("");
  document.head.appendChild(style);
};

export interface ShadowRootProps {
  theme: "light" | "dark";
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

/**
 * Renders its children into an isolated shadow root with the compiled panel
 * stylesheet. A dedicated React root is mounted inside the shadow root so
 * React's event delegation works (a portal from the outer root would leave the
 * listeners in the light DOM, where shadow retargeting breaks them).
 */
export const ShadowRoot = ({
  theme,
  className,
  style,
  children,
}: ShadowRootProps) => {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<Root | null>(null);
  const mountRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const shadow = host.shadowRoot ?? host.attachShadow({ mode: "open" });
    if (!shadow.querySelector("style[data-aui-devtools]")) {
      const styleEl = document.createElement("style");
      styleEl.setAttribute("data-aui-devtools", "");
      styleEl.textContent = panelCss;
      shadow.appendChild(styleEl);
    }
    hoistAtProperties();

    const mount = document.createElement("div");
    mount.style.display = "contents";
    shadow.appendChild(mount);
    mountRef.current = mount;
    rootRef.current = createRoot(mount);

    return () => {
      const root = rootRef.current;
      rootRef.current = null;
      mountRef.current = null;
      queueMicrotask(() => {
        root?.unmount();
        mount.remove();
      });
    };
  }, []);

  useEffect(() => {
    const mount = mountRef.current;
    if (mount) mount.className = theme === "dark" ? "dark" : "";
    rootRef.current?.render(children);
  }, [children, theme]);

  return <div ref={hostRef} className={className} style={style} />;
};
