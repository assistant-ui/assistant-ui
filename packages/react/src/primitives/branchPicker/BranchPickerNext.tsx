"use client";

import { useGoToNextBranch } from "../../actions/useGoToNextBranch";
import { createActionButton } from "../../utils/createActionButton";

export const BranchPickerNext = createActionButton(useGoToNextBranch);
