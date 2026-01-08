import { z } from "zod";

const WeatherAlertsSchema = z.object({
  region: z.string(),
  alerts: z.array(
    z.object({
      type: z.string(),
      severity: z.enum(["low", "moderate", "high", "extreme"]),
      expires: z.string(),
    }),
  ),
});

const severityColors: Record<string, string> = {
  low: "#22c55e",
  moderate: "#eab308",
  high: "#f97316",
  extreme: "#ef4444",
};

const severityBackgrounds: Record<string, string> = {
  low: "rgba(34, 197, 94, 0.1)",
  moderate: "rgba(234, 179, 8, 0.1)",
  high: "rgba(249, 115, 22, 0.1)",
  extreme: "rgba(239, 68, 68, 0.1)",
};

function renderWeatherAlerts(
  props: z.infer<typeof WeatherAlertsSchema>,
): string {
  const alertsHtml = props.alerts
    .map(
      (alert) => `
    <div style="
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 16px;
      background: ${severityBackgrounds[alert.severity]};
      border-radius: 12px;
      border-left: 4px solid ${severityColors[alert.severity]};
      border: 1px solid rgba(255,255,255,0.1);
      backdrop-filter: blur(10px);
    ">
      <div style="
        width: 12px;
        height: 12px;
        background: ${severityColors[alert.severity]};
        border-radius: 50%;
        box-shadow: 0 0 8px ${severityColors[alert.severity]};
        animation: pulse 2s infinite;
      "></div>
      <div style="flex: 1;">
        <div style="font-weight: 600; font-size: 16px; margin-bottom: 4px;">${alert.type}</div>
        <div style="font-size: 12px; opacity: 0.8;">
          ⏰ Expires: ${new Date(alert.expires).toLocaleString()}
        </div>
      </div>
      <div style="
        padding: 6px 12px;
        background: ${severityColors[alert.severity]};
        color: white;
        border-radius: 6px;
        font-size: 11px;
        text-transform: uppercase;
        font-weight: 700;
        letter-spacing: 0.5px;
        box-shadow: 0 2px 4px rgba(0,0,0,0.2);
      ">${alert.severity}</div>
    </div>
  `,
    )
    .join("");

  const highestSeverity =
    props.alerts.length > 0
      ? props.alerts.reduce((prev, current) => {
          const severityOrder = { low: 0, moderate: 1, high: 2, extreme: 3 };
          return severityOrder[current.severity] > severityOrder[prev.severity]
            ? current
            : prev;
        }).severity
      : null;

  const alertSummary = highestSeverity
    ? `${props.alerts.length} active alert${props.alerts.length > 1 ? "s" : ""}`
    : "No active alerts";

  return `
    <div style="
      padding: 24px;
      background: linear-gradient(135deg, #1e3a5f 0%, #0f172a 100%);
      color: white;
      border-radius: 16px;
      max-width: 500px;
      margin: 0 auto;
      border: 1px solid rgba(255,255,255,0.1);
      box-shadow: 0 8px 32px rgba(0,0,0,0.3);
    ">
      <div style="
        display: flex;
        align-items: center;
        gap: 12px;
        margin-bottom: 20px;
        padding-bottom: 16px;
        border-bottom: 1px solid rgba(255,255,255,0.2);
      ">
        <span style="font-size: 28px;">⚠️</span>
        <div>
          <h3 style="margin: 0; font-size: 20px; font-weight: 700;">Weather Alerts</h3>
          <div style="font-size: 14px; opacity: 0.8; margin-top: 2px;">
            ${props.region} • ${alertSummary}
          </div>
        </div>
        ${
          highestSeverity
            ? `
          <div style="
            margin-left: auto;
            padding: 4px 8px;
            background: ${severityColors[highestSeverity]};
            color: white;
            border-radius: 4px;
            font-size: 10px;
            text-transform: uppercase;
            font-weight: 600;
          ">${highestSeverity}</div>
        `
            : ""
        }
      </div>
      
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${alertsHtml || '<div style="opacity: 0.6; text-align: center; padding: 20px; font-style: italic;">✨ No active weather alerts for this region</div>'}
      </div>
      
      <div style="
        margin-top: 16px;
        padding-top: 16px;
        border-top: 1px solid rgba(255,255,255,0.2);
        font-size: 11px;
        opacity: 0.6;
        text-align: center;
      ">
        Weather data provided by demonstration system • Not for real emergency use
      </div>
      
      <style>
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.7; transform: scale(1.1); }
        }
      </style>
    </div>
  `;
}

export const WeatherAlertsComponent = {
  name: "WeatherAlerts",
  schema: WeatherAlertsSchema,
  render: renderWeatherAlerts,
};
