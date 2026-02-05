import posthog from "posthog-js";

const apiKey = process.env["NEXT_PUBLIC_POSTHOG_API_KEY"];

if (apiKey) {
  posthog.init(apiKey, {
    api_host: "/ph",
    ui_host: "https://us.posthog.com",
    defaults: "2025-11-30",
    capture_exceptions: true,
  });

  if (typeof window !== "undefined") {
    window.posthog = {
      capture: (event, properties) => posthog.capture(event, properties),
    };
  }
}
