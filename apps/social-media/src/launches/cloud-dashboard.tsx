import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const _PURPLE = "#7c3aed";

const screenshotPath = fileURLToPath(
  new URL("./cloud-dashboard.png", import.meta.url),
);
const screenshotBase64 = `data:image/png;base64,${readFileSync(screenshotPath).toString("base64")}`;

export default function CloudDashboardLaunch() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        height: "100%",
        background: "#000000",
        color: "white",
        fontFamily: "Inter",
        overflow: "hidden",
        position: "relative",
      }}
    >
      {/* Text content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "60px 80px 0 80px",
          gap: "8px",
        }}
      >
        <div style={{ fontSize: "72px", fontWeight: 700, lineHeight: 1.1 }}>
          assistant cloud
        </div>
        <div
          style={{
            fontSize: "36px",
            opacity: 0.5,
            lineHeight: 1.4,
          }}
        >
          Analytics, threads, and billing in one place.
        </div>
      </div>

      {/* Screenshot — no frame, full width */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "-80px",
          left: "80px",
          right: "80px",
          borderRadius: "12px",
          overflow: "hidden",
          boxShadow: "0 20px 60px rgba(0,0,0,0.6)",
          top: "220px",
        }}
      >
        {/* biome-ignore lint/performance/noImgElement: next/image not applicable here */}
        <img
          alt=""
          src={screenshotBase64}
          width={1440}
          style={{ display: "flex" }}
        />
      </div>
    </div>
  );
}
