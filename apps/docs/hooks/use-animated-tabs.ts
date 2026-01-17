"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";

const useIsomorphicLayoutEffect =
  typeof window !== "undefined" ? useLayoutEffect : useEffect;

type TabStyle = { left: number; width: number };

type UseAnimatedTabsOptions = {
  activeIndex: number;
};

type UseAnimatedTabsResult = {
  containerRef: React.RefObject<HTMLDivElement | null>;
  tabRefs: React.MutableRefObject<(HTMLButtonElement | null)[]>;
  hoveredIndex: number | null;
  setHoveredIndex: (index: number | null) => void;
  activeStyle: TabStyle;
  hoverStyle: TabStyle;
};

export function useAnimatedTabs({
  activeIndex,
}: UseAnimatedTabsOptions): UseAnimatedTabsResult {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const [activeStyle, setActiveStyle] = useState<TabStyle>({
    left: 0,
    width: 0,
  });
  const [hoverStyle, setHoverStyle] = useState<TabStyle>({ left: 0, width: 0 });
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  // Update active indicator position
  useIsomorphicLayoutEffect(() => {
    const el = tabRefs.current[activeIndex];
    if (el && el.offsetWidth > 0) {
      setActiveStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [activeIndex]);

  // Re-calculate when container resizes (e.g., becomes visible after tab switch)
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new ResizeObserver(() => {
      const el = tabRefs.current[activeIndex];
      if (el && el.offsetWidth > 0) {
        setActiveStyle({ left: el.offsetLeft, width: el.offsetWidth });
      }
    });
    observer.observe(container);
    return () => observer.disconnect();
  }, [activeIndex]);

  // Update hover indicator position
  useEffect(() => {
    if (hoveredIndex === null) return;
    const el = tabRefs.current[hoveredIndex];
    if (el) {
      setHoverStyle({ left: el.offsetLeft, width: el.offsetWidth });
    }
  }, [hoveredIndex]);

  return {
    containerRef,
    tabRefs,
    hoveredIndex,
    setHoveredIndex,
    activeStyle,
    hoverStyle,
  };
}
