import posthog from "posthog-js";

export function startPostHog(apiKey: string, deploySha: string | undefined) {
  // reset() clears registered properties along with the identity, so a sign-out
  // registers them again.
  const registerSuperProperties = () =>
    posthog.register({
      app: "docs",
      ...(deploySha ? { deploy_sha: deploySha } : {}),
    });
  posthog.init(apiKey, {
    api_host: "/ph",
    ui_host: "https://us.posthog.com",
    defaults: "2025-11-30",
    // What the defaults date already implies, pinned so bumping the date
    // cannot change how pageviews are counted.
    capture_pageview: "history_change",
    autocapture: false,
    capture_exceptions: true,
    mask_personal_data_properties: true,
  });
  // opt_out_capturing persists and init honors it on every later load, so an
  // accept that reverses a decline lifts it here, before the start is
  // announced and the waiting identity is applied.
  if (posthog.has_opted_out_capturing()) posthog.opt_in_capturing();
  registerSuperProperties();

  window.posthog = {
    capture: (event, properties) => posthog.capture(event, properties),
    // A decline leaves posthog loaded, and identify and group would still
    // write the identity to its cookie.
    identify: (distinctId) => {
      if (!posthog.has_opted_out_capturing()) posthog.identify(distinctId);
    },
    // reset() also clears posthog's stored opt-out, which a decline set and
    // which has to outlive the sign-out.
    reset: () => {
      const optedOut = posthog.has_opted_out_capturing();
      posthog.reset();
      if (optedOut) posthog.opt_out_capturing();
      registerSuperProperties();
    },
    group: (type, key) => {
      if (!posthog.has_opted_out_capturing()) posthog.group(type, key);
    },
    capturing: () => !posthog.has_opted_out_capturing(),
  };
  return posthog;
}
