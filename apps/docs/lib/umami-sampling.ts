const STORAGE_KEY = "aui-umami-sample";

export const UMAMI_SAMPLE_RATE = 0.01;

const roll = () => Math.random() < UMAMI_SAMPLE_RATE;

/**
 * Umami records a sampled slice of traffic; PostHog stays the full-fidelity source.
 *
 * The decision is made once per session rather than per event, so bounce rate, pages
 * per session and session duration stay correct and only counts need scaling by
 * 1 / UMAMI_SAMPLE_RATE. Sampling individual events would break those ratios.
 */
export const isSampledSession = () => {
  try {
    const stored = window.sessionStorage.getItem(STORAGE_KEY);
    if (stored !== null) return stored === "1";

    const sampled = roll();
    window.sessionStorage.setItem(STORAGE_KEY, sampled ? "1" : "0");
    return sampled;
  } catch {
    // Session storage is unavailable in private modes and when site data is blocked.
    // Rolling per load keeps the aggregate rate correct, trading session continuity
    // for those visitors rather than dropping them and biasing the sample.
    return roll();
  }
};
