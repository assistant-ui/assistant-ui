"use client";

import {
  createContext,
  useContext,
  useState,
  useMemo,
  type ReactNode,
  type ComponentPropsWithoutRef,
} from "react";
import {
  useAgentWorkspace,
  useWorkspaceTasks,
} from "../../hooks/useAgentWorkspace";
import type { TaskRuntime } from "../../runtime/TaskRuntime";

export type ViewMode = "table" | "split" | "detail";

interface WorkspaceContextValue {
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  selectedTaskId: string | null;
  selectTask: (taskId: string | null) => void;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

function useWorkspaceContext() {
  const ctx = useContext(WorkspaceContext);
  if (!ctx) {
    throw new Error(
      "useWorkspaceContext must be used within WorkspacePrimitive.Root",
    );
  }
  return ctx;
}

// Export hook for accessing workspace UI state
export function useWorkspaceUI() {
  return useWorkspaceContext();
}

export interface WorkspaceRootProps {
  defaultViewMode?: ViewMode;
  onSelectTask?: (taskId: string | null) => void;
  children: ReactNode;
}

function WorkspaceRoot({
  defaultViewMode = "split",
  onSelectTask,
  children,
}: WorkspaceRootProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(defaultViewMode);
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  const selectTask = (taskId: string | null) => {
    setSelectedTaskId(taskId);
    onSelectTask?.(taskId);
  };

  const value = useMemo(
    () => ({
      viewMode,
      setViewMode,
      selectedTaskId,
      selectTask,
    }),
    [viewMode, selectedTaskId, onSelectTask],
  );

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

WorkspaceRoot.displayName = "WorkspacePrimitive.Root";

export interface WorkspaceTasksProps {
  children: (tasks: TaskRuntime[]) => ReactNode;
}

function WorkspaceTasks({ children }: WorkspaceTasksProps) {
  const tasks = useWorkspaceTasks();
  return <>{children(tasks)}</>;
}

WorkspaceTasks.displayName = "WorkspacePrimitive.Tasks";

export interface WorkspaceTotalCostProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children?: (cost: number) => ReactNode;
  precision?: number;
}

function WorkspaceTotalCost({
  children,
  precision = 4,
  ...props
}: WorkspaceTotalCostProps) {
  const tasks = useWorkspaceTasks();
  const totalCost = tasks.reduce((sum, task) => sum + task.getState().cost, 0);

  return (
    <span {...props}>
      {typeof children === "function"
        ? children(totalCost)
        : `$${totalCost.toFixed(precision)}`}
    </span>
  );
}

WorkspaceTotalCost.displayName = "WorkspacePrimitive.TotalCost";

function WorkspaceSelectedTaskId(props: ComponentPropsWithoutRef<"span">) {
  const { selectedTaskId } = useWorkspaceContext();
  return <span {...props}>{selectedTaskId}</span>;
}

WorkspaceSelectedTaskId.displayName = "WorkspacePrimitive.SelectedTaskId";

export interface WorkspaceSelectedTaskProps {
  children: (task: TaskRuntime | null) => ReactNode;
}

function WorkspaceSelectedTask({ children }: WorkspaceSelectedTaskProps) {
  const workspace = useAgentWorkspace();
  const { selectedTaskId } = useWorkspaceContext();
  const task = selectedTaskId
    ? (workspace.getTask(selectedTaskId) ?? null)
    : null;
  return <>{children(task)}</>;
}

WorkspaceSelectedTask.displayName = "WorkspacePrimitive.SelectedTask";

export interface WorkspaceViewModeProps
  extends Omit<ComponentPropsWithoutRef<"span">, "children"> {
  children?: (mode: ViewMode) => ReactNode;
}

function WorkspaceViewMode({ children, ...props }: WorkspaceViewModeProps) {
  const { viewMode } = useWorkspaceContext();
  return (
    <span {...props}>
      {typeof children === "function" ? children(viewMode) : viewMode}
    </span>
  );
}

WorkspaceViewMode.displayName = "WorkspacePrimitive.ViewMode";

// View mode buttons - always render (use data-active for styling), never return null
function TableView({
  children,
  disabled,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { setViewMode, viewMode } = useWorkspaceContext();
  const isActive = viewMode === "table";
  return (
    <button
      type="button"
      disabled={disabled || isActive}
      data-active={isActive || undefined}
      onClick={(e) => {
        setViewMode("table");
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
TableView.displayName = "WorkspacePrimitive.TableView";

function SplitView({
  children,
  disabled,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { setViewMode, viewMode } = useWorkspaceContext();
  const isActive = viewMode === "split";
  return (
    <button
      type="button"
      disabled={disabled || isActive}
      data-active={isActive || undefined}
      onClick={(e) => {
        setViewMode("split");
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
SplitView.displayName = "WorkspacePrimitive.SplitView";

function DetailView({
  children,
  disabled,
  onClick,
  ...props
}: ComponentPropsWithoutRef<"button">) {
  const { setViewMode, viewMode } = useWorkspaceContext();
  const isActive = viewMode === "detail";
  return (
    <button
      type="button"
      disabled={disabled || isActive}
      data-active={isActive || undefined}
      onClick={(e) => {
        setViewMode("detail");
        onClick?.(e);
      }}
      {...props}
    >
      {children}
    </button>
  );
}
DetailView.displayName = "WorkspacePrimitive.DetailView";

export const WorkspacePrimitive = {
  Root: WorkspaceRoot,
  Tasks: WorkspaceTasks,
  TotalCost: WorkspaceTotalCost,
  SelectedTaskId: WorkspaceSelectedTaskId,
  SelectedTask: WorkspaceSelectedTask,
  ViewMode: WorkspaceViewMode,
  TableView,
  SplitView,
  DetailView,
};
