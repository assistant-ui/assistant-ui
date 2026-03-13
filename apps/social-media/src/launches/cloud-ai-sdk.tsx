const BLUE = "#3b82f6";
const CODE_BG = "rgba(0,0,0,0.4)";

function CodeComparison() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        width: "600px",
      }}
    >
      {/* Before */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: CODE_BG,
          borderRadius: "12px",
          padding: "18px 24px",
          border: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "14px",
            color: "rgba(255,255,255,0.35)",
            marginBottom: "10px",
            fontFamily: "Inter",
          }}
        >
          Before
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#e0e0e0",
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: "#c084fc" }}>import</span>
          <span style={{ marginLeft: "8px" }}>{"{"}</span>
          <span style={{ marginLeft: "6px", color: "#fbbf24" }}>useChat</span>
          <span style={{ marginLeft: "6px" }}>{"}"}</span>
          <span style={{ marginLeft: "8px", color: "#c084fc" }}>from</span>
          <span style={{ marginLeft: "8px", color: "#86efac" }}>
            {'"@ai-sdk/react"'}
          </span>
        </div>
      </div>

      {/* After */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          background: CODE_BG,
          borderRadius: "12px",
          padding: "18px 24px",
          border: `1px solid ${BLUE}50`,
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: "14px",
            color: BLUE,
            marginBottom: "10px",
            fontFamily: "Inter",
          }}
        >
          After
        </div>
        <div
          style={{
            display: "flex",
            fontFamily: "monospace",
            fontSize: "18px",
            color: "#e0e0e0",
            lineHeight: 1.6,
          }}
        >
          <span style={{ color: "#c084fc" }}>import</span>
          <span style={{ marginLeft: "8px" }}>{"{"}</span>
          <span style={{ marginLeft: "6px", color: "#fbbf24" }}>
            useCloudChat
          </span>
          <span style={{ marginLeft: "6px" }}>{"}"}</span>
          <span style={{ marginLeft: "8px", color: "#c084fc" }}>from</span>
          <span style={{ marginLeft: "8px", color: "#86efac" }}>
            {'"@assistant-ui/cloud-ai-sdk"'}
          </span>
        </div>
      </div>
    </div>
  );
}

export default function CloudAiSdkLaunch() {
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
          padding: "110px 140px 0 140px",
          gap: "12px",
        }}
      >
        <div
          style={{
            fontSize: "52px",
            opacity: 0.5,
          }}
        >
          Introducing
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginBottom: "8px",
          }}
        >
          <div style={{ fontSize: "110px", fontWeight: 700, lineHeight: 1.1 }}>
            @assistant-ui/
          </div>
          <div
            style={{
              fontSize: "110px",
              fontWeight: 700,
              lineHeight: 1.1,
              color: BLUE,
            }}
          >
            cloud-ai-sdk
          </div>
        </div>
        <div
          style={{
            fontSize: "44px",
            opacity: 0.6,
            lineHeight: 1.4,
          }}
        >
          One import change. Full cloud persistence.
        </div>
        {/* Install pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.08)",
            border: "1px solid rgba(255,255,255,0.15)",
            borderRadius: "12px",
            padding: "16px 28px",
            fontSize: "36px",
            fontFamily: "monospace",
            color: "rgba(255,255,255,0.85)",
            alignSelf: "flex-start",
            marginTop: "8px",
          }}
        >
          {">"} npm i @assistant-ui/cloud-ai-sdk @ai-sdk/react ai
        </div>
      </div>

      {/* Code comparison at bottom right */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "-60px",
          right: "100px",
        }}
      >
        <CodeComparison />
      </div>
    </div>
  );
}
