import type { ToolsState } from "../types/scopes";

type ToolActivity = ToolsState["toolActivities"][string];

export const setToolActivityState = (
  state: ToolsState,
  toolName: string,
  activity: ToolActivity,
): ToolsState => ({
  ...state,
  toolActivities: {
    ...state.toolActivities,
    [toolName]: activity,
  },
});

export const clearToolActivityState = (
  state: ToolsState,
  toolName: string,
  activity: ToolActivity,
): ToolsState => {
  if (state.toolActivities[toolName] !== activity) {
    return state;
  }

  const nextToolActivities = { ...state.toolActivities };
  delete nextToolActivities[toolName];
  return {
    ...state,
    toolActivities: nextToolActivities,
  };
};
