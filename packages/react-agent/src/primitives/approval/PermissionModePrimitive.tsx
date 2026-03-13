"use client";

import type { MouseEvent, ReactNode } from "react";
import {
  usePermissionMode,
  useSetPermissionMode,
} from "../../hooks/usePermissionMode";

export interface PermissionModeRootProps {
  children?: ReactNode | ((mode: string) => ReactNode);
}

function PermissionModeRoot({
  children,
  ...props
}: PermissionModeRootProps & any) {
  const mode = usePermissionMode();
  return (
    <div {...props}>
      {typeof children === "function" ? children(mode) : children}
    </div>
  );
}

PermissionModeRoot.displayName = "PermissionModePrimitive.Root";

export interface PermissionModeCurrentProps {
  children?: ReactNode | ((mode: string) => ReactNode);
}

function PermissionModeCurrent({
  children,
  ...props
}: PermissionModeCurrentProps & any) {
  const mode = usePermissionMode();
  return (
    <span {...props}>
      {typeof children === "function"
        ? children(mode)
        : children !== undefined
          ? children
          : mode}
    </span>
  );
}

PermissionModeCurrent.displayName = "PermissionModePrimitive.CurrentMode";

function SetAskAll({ children, onClick, ...props }: any) {
  const setMode = useSetPermissionMode();
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    setMode("ask-all");
  };
  return (
    <button type="button" onClick={handleClick} {...props}>
      {children || "Ask All"}
    </button>
  );
}

SetAskAll.displayName = "PermissionModePrimitive.SetAskAll";

function SetAutoReads({ children, onClick, ...props }: any) {
  const setMode = useSetPermissionMode();
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    setMode("auto-reads");
  };
  return (
    <button type="button" onClick={handleClick} {...props}>
      {children || "Auto Reads"}
    </button>
  );
}

SetAutoReads.displayName = "PermissionModePrimitive.SetAutoReads";

function SetAutoAll({ children, onClick, ...props }: any) {
  const setMode = useSetPermissionMode();
  const handleClick = (e: MouseEvent<HTMLButtonElement>) => {
    onClick?.(e);
    if (e.defaultPrevented) return;
    setMode("auto-all");
  };
  return (
    <button type="button" onClick={handleClick} {...props}>
      {children || "Auto All"}
    </button>
  );
}

SetAutoAll.displayName = "PermissionModePrimitive.SetAutoAll";

export const PermissionModePrimitive = {
  Root: PermissionModeRoot,
  CurrentMode: PermissionModeCurrent,
  SetAskAll: SetAskAll,
  SetAutoReads: SetAutoReads,
  SetAutoAll: SetAutoAll,
};
