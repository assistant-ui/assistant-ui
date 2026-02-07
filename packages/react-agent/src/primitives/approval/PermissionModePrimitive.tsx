"use client";

import type { ReactNode } from "react";
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
      {typeof children === "function" ? children(mode) : mode}
    </span>
  );
}

PermissionModeCurrent.displayName = "PermissionModePrimitive.CurrentMode";

function SetAskAll({ children, ...props }: any) {
  const setMode = useSetPermissionMode();
  return (
    <button type="button" onClick={() => setMode("ask-all")} {...props}>
      {children || "Ask All"}
    </button>
  );
}

SetAskAll.displayName = "PermissionModePrimitive.SetAskAll";

function SetAutoReads({ children, ...props }: any) {
  const setMode = useSetPermissionMode();
  return (
    <button type="button" onClick={() => setMode("auto-reads")} {...props}>
      {children || "Auto Reads"}
    </button>
  );
}

SetAutoReads.displayName = "PermissionModePrimitive.SetAutoReads";

function SetAutoAll({ children, ...props }: any) {
  const setMode = useSetPermissionMode();
  return (
    <button type="button" onClick={() => setMode("auto-all")} {...props}>
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
