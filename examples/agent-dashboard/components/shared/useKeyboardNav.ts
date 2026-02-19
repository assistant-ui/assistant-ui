"use client";

import { useState, useEffect, useCallback } from "react";

export interface UseKeyboardNavOptions<T> {
  items: T[];
  onActivate?: (item: T, index: number) => void;
  onNavigate?: (item: T, index: number) => void;
  enabled?: boolean;
  loop?: boolean;
  initialIndex?: number;
}

export interface UseKeyboardNavResult {
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  navigateUp: () => void;
  navigateDown: () => void;
  activate: () => void;
}

export function useKeyboardNav<T>({
  items,
  onActivate,
  onNavigate,
  enabled = true,
  loop = false,
  initialIndex = 0,
}: UseKeyboardNavOptions<T>): UseKeyboardNavResult {
  const [selectedIndex, setSelectedIndex] = useState(initialIndex);

  // Clamp index when items change
  useEffect(() => {
    if (items.length === 0) {
      setSelectedIndex(0);
    } else if (selectedIndex >= items.length) {
      setSelectedIndex(items.length - 1);
    }
  }, [items.length, selectedIndex]);

  const navigateUp = useCallback(() => {
    setSelectedIndex((prev) => {
      let newIndex: number;
      if (prev <= 0) {
        newIndex = loop ? items.length - 1 : 0;
      } else {
        newIndex = prev - 1;
      }
      const item = items[newIndex];
      if (item !== undefined) {
        onNavigate?.(item, newIndex);
      }
      return newIndex;
    });
  }, [items, loop, onNavigate]);

  const navigateDown = useCallback(() => {
    setSelectedIndex((prev) => {
      let newIndex: number;
      if (prev >= items.length - 1) {
        newIndex = loop ? 0 : items.length - 1;
      } else {
        newIndex = prev + 1;
      }
      const item = items[newIndex];
      if (item !== undefined) {
        onNavigate?.(item, newIndex);
      }
      return newIndex;
    });
  }, [items, loop, onNavigate]);

  const activate = useCallback(() => {
    if (items[selectedIndex]) {
      onActivate?.(items[selectedIndex], selectedIndex);
    }
  }, [items, selectedIndex, onActivate]);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        return;
      }

      switch (e.key) {
        case "j":
        case "ArrowDown":
          e.preventDefault();
          navigateDown();
          break;
        case "k":
        case "ArrowUp":
          e.preventDefault();
          navigateUp();
          break;
        case "Enter":
          e.preventDefault();
          activate();
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [enabled, navigateDown, navigateUp, activate]);

  return {
    selectedIndex,
    setSelectedIndex,
    navigateUp,
    navigateDown,
    activate,
  };
}

// Extended hook with additional keyboard shortcuts
export interface UseExtendedKeyboardNavOptions<T>
  extends UseKeyboardNavOptions<T> {
  onApprove?: (item: T, index: number) => void;
  onDeny?: (item: T, index: number) => void;
  onApproveSession?: (item: T, index: number) => void;
  onApproveAll?: () => void;
  onDenyAll?: () => void;
  onCancel?: () => void;
  onSearch?: () => void;
  onNew?: () => void;
  onEscape?: () => void;
}

export function useExtendedKeyboardNav<T>({
  items,
  onActivate,
  onNavigate,
  enabled = true,
  loop = false,
  initialIndex = 0,
  onApprove,
  onDeny,
  onApproveSession,
  onApproveAll,
  onDenyAll,
  onCancel,
  onSearch,
  onNew,
  onEscape,
}: UseExtendedKeyboardNavOptions<T>): UseKeyboardNavResult {
  const baseOptions: UseKeyboardNavOptions<T> = {
    items,
    enabled,
    loop,
    initialIndex,
  };
  if (onActivate) baseOptions.onActivate = onActivate;
  if (onNavigate) baseOptions.onNavigate = onNavigate;
  const nav = useKeyboardNav(baseOptions);

  useEffect(() => {
    if (!enabled) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      const target = e.target as HTMLElement;
      if (
        target.tagName === "INPUT" ||
        target.tagName === "TEXTAREA" ||
        target.isContentEditable
      ) {
        // Allow Escape to work even in inputs
        if (e.key === "Escape") {
          e.preventDefault();
          onEscape?.();
        }
        return;
      }

      const item = items[nav.selectedIndex];

      switch (e.key) {
        case "y":
        case "A":
          if (e.shiftKey && onApproveAll) {
            e.preventDefault();
            onApproveAll();
          } else if (item && onApprove) {
            e.preventDefault();
            onApprove(item, nav.selectedIndex);
          }
          break;
        case "d":
        case "D":
          if (e.shiftKey && onDenyAll) {
            e.preventDefault();
            onDenyAll();
          } else if (item && onDeny) {
            e.preventDefault();
            onDeny(item, nav.selectedIndex);
          }
          break;
        case "s":
          if (item && onApproveSession) {
            e.preventDefault();
            onApproveSession(item, nav.selectedIndex);
          }
          break;
        case "c":
          if (onCancel) {
            e.preventDefault();
            onCancel();
          }
          break;
        case "/":
          if (onSearch) {
            e.preventDefault();
            onSearch();
          }
          break;
        case "n":
          if (onNew) {
            e.preventDefault();
            onNew();
          }
          break;
        case "Escape":
          if (onEscape) {
            e.preventDefault();
            onEscape();
          }
          break;
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    enabled,
    items,
    nav.selectedIndex,
    onApprove,
    onDeny,
    onApproveSession,
    onApproveAll,
    onDenyAll,
    onCancel,
    onSearch,
    onNew,
    onEscape,
  ]);

  return nav;
}
