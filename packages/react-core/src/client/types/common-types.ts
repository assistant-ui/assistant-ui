export type StateWithActions<TState, TActions> = {
  readonly state: TState;
  readonly actions: TActions;
};
