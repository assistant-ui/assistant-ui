"use client";

import { useGoToPreviousBranch } from "../../actions/useGoToPreviousBranch";
import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerPrevious = createActionButton(useGoToPreviousBranch);
