"use client";

import type { FC } from "react";
import { useMessage } from "../../context/react/MessageContext";

/**
 * Hook that provides the current branch count.
 * 
 * This hook returns the total number of branches available for the current message.
 * 
 * @returns The total number of branches for the current message
 * 
 * @example
 * ```tsx
 * function CustomBranchCounter() {
 *   const count = useBranchPickerCount();
 *   
 *   return (
 *     <span>
 *       {count} {count === 1 ? 'branch' : 'branches'} available
 *     </span>
 *   );
 * }
 * ```
 */
const useBranchPickerCount = () => {
  const branchCount = useMessage((s) => s.branchCount);
  return branchCount;
};

export namespace BranchPickerPrimitiveCount {
  /**
   * Props for the BranchPickerPrimitive.Count component.
   * This component takes no props.
   */
  export type Props = Record<string, never>;
}

/**
 * A component that displays the total number of branches for the current message.
 * 
 * This component renders the branch count as plain text, useful for showing
 * users how many alternative responses are available.
 * 
 * @example
 * ```tsx
 * <div>
 *   Branch <BranchPickerPrimitive.Count /> of {totalBranches}
 * </div>
 * ```
 */
export const BranchPickerPrimitiveCount: FC<
  BranchPickerPrimitiveCount.Props
> = () => {
  const branchCount = useBranchPickerCount();
  return <>{branchCount}</>;
};

BranchPickerPrimitiveCount.displayName = "BranchPickerPrimitive.Count";
