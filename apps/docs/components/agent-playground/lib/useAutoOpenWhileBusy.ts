import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Drives a collapsible's open state based on a "busy" signal (e.g. tool is running
 * or its result has not arrived yet) while still allowing the user to override.
 *
 * Behavior:
 * - While `busy` is true and the user has not toggled, the collapsible is open.
 * - When `busy` flips false and the user has not toggled, it auto-collapses.
 * - If the user toggles at any point, that choice is sticky (auto-control is
 *   released) until `busy` transitions from false → true again (a new run).
 *
 * This means older / completed messages render with `busy=false` from the start
 * and are fully user-controlled (default closed, user can expand freely).
 */
export function useAutoOpenWhileBusy(busy: boolean): {
  open: boolean;
  onOpenChange: (next: boolean) => void;
} {
  const [userOverride, setUserOverride] = useState<boolean | null>(null);
  const prevBusyRef = useRef(busy);

  useEffect(() => {
    // New run starting: drop any prior user override so auto-control resumes.
    if (busy && !prevBusyRef.current) {
      setUserOverride(null);
    }
    prevBusyRef.current = busy;
  }, [busy]);

  const open = userOverride !== null ? userOverride : busy;

  const onOpenChange = useCallback((next: boolean) => {
    setUserOverride(next);
  }, []);

  return { open, onOpenChange };
}
