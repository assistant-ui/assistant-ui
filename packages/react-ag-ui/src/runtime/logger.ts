export type Logger = {
  debug: (...a: any[]) => void;
  error: (...a: any[]) => void;
};

export const makeLogger = (l?: Partial<Logger>): Logger => ({
  debug: (...a) => l?.debug?.(...a),
  error: (...a) => l?.error?.(...a),
});
