const GREEN = "#10b981";
const CODE_BG = "rgba(0,0,0,0.4)";

function TerminalMockup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "520px",
        height: "620px",
        borderRadius: "16px",
        border: "2px solid #3a3a3c",
        background: "#1a1a1a",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow:
          "0 0 0 1px rgba(255,255,255,0.08), 0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Titlebar */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          padding: "14px 18px",
          background: "#2a2a2a",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          gap: "8px",
        }}
      >
        <div style={{ display: "flex", gap: "7px" }}>
          <div
            style={{
              display: "flex",
              width: "13px",
              height: "13px",
              borderRadius: "50%",
              background: "#ff5f57",
            }}
          />
          <div
            style={{
              display: "flex",
              width: "13px",
              height: "13px",
              borderRadius: "50%",
              background: "#febc2e",
            }}
          />
          <div
            style={{
              display: "flex",
              width: "13px",
              height: "13px",
              borderRadius: "50%",
              background: "#28c840",
            }}
          />
        </div>
        <div
          style={{
            flex: 1,
            textAlign: "center",
            fontSize: "13px",
            color: "rgba(255,255,255,0.4)",
            fontFamily: "monospace",
          }}
        >
          assistant-ui ink
        </div>
      </div>

      {/* Terminal content */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          padding: "18px 20px",
          fontFamily: "monospace",
          fontSize: "14px",
          lineHeight: 1.7,
          color: "#e0e0e0",
          gap: "4px",
        }}
      >
        {/* Header */}
        <div style={{ display: "flex", color: "#22d3ee", fontWeight: 700 }}>
          assistant-ui Terminal Chat
        </div>
        <div style={{ display: "flex", color: "#6b7280", fontSize: "13px" }}>
          Type a message and press Enter to send.
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", height: "12px" }} />

        {/* User message */}
        <div style={{ display: "flex" }}>
          <span style={{ color: "#34d399", fontWeight: 700 }}>You: </span>
          <span>What are JavaScript Promises?</span>
        </div>

        {/* Spacer */}
        <div style={{ display: "flex", height: "8px" }} />

        {/* AI label */}
        <div style={{ display: "flex", color: "#60a5fa", fontWeight: 700 }}>
          AI:
        </div>

        {/* AI heading */}
        <div style={{ display: "flex", fontWeight: 700 }}>
          Response to your question
        </div>

        {/* AI text */}
        <div style={{ display: "flex", marginTop: "4px" }}>
          A <span style={{ fontWeight: 700, marginLeft: "4px" }}>Promise</span>{" "}
          <span style={{ marginLeft: "4px" }}>represents an</span>{" "}
          <span style={{ color: "#a78bfa", marginLeft: "4px" }}>
            async operation
          </span>
        </div>

        {/* Code block */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            background: CODE_BG,
            borderRadius: "8px",
            padding: "10px 14px",
            fontSize: "12px",
            lineHeight: 1.6,
            marginTop: "8px",
            gap: "2px",
          }}
        >
          <div style={{ display: "flex", color: "#a78bfa" }}>
            {"const promise = new Promise((resolve) => {"}
          </div>
          <div style={{ display: "flex", color: "#a78bfa" }}>
            {'  setTimeout(() => resolve("done!"), 1000);'}
          </div>
          <div style={{ display: "flex", color: "#a78bfa" }}>{"});"}</div>
        </div>

        {/* List items */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            marginTop: "8px",
            gap: "2px",
          }}
        >
          <div style={{ display: "flex", color: "#d4d4d4" }}>
            <span style={{ color: "#6b7280" }}>{"  • "}</span>
            <span style={{ color: "#fbbf24" }}>pending</span>
            <span style={{ marginLeft: "4px" }}> — initial state</span>
          </div>
          <div style={{ display: "flex", color: "#d4d4d4" }}>
            <span style={{ color: "#6b7280" }}>{"  • "}</span>
            <span style={{ color: "#34d399" }}>fulfilled</span>
            <span style={{ marginLeft: "4px" }}> — completed</span>
          </div>
          <div style={{ display: "flex", color: "#d4d4d4" }}>
            <span style={{ color: "#6b7280" }}>{"  • "}</span>
            <span style={{ color: "#f87171" }}>rejected</span>
            <span style={{ marginLeft: "4px" }}> — failed</span>
          </div>
        </div>

        {/* Input prompt */}
        <div
          style={{
            display: "flex",
            marginTop: "16px",
            borderTop: "1px solid rgba(255,255,255,0.08)",
            paddingTop: "12px",
            alignItems: "center",
          }}
        >
          <span style={{ color: "#6b7280" }}>{">"} </span>
          <span style={{ color: "#6b7280" }}>Type a message...</span>
          <div
            style={{
              display: "flex",
              width: "8px",
              height: "16px",
              background: GREEN,
              marginLeft: "2px",
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default function ReactInkLaunch() {
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
      {/* Text content - top area */}
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
              color: GREEN,
            }}
          >
            react-ink
          </div>
        </div>
        <div
          style={{
            fontSize: "44px",
            opacity: 0.6,
            lineHeight: 1.4,
          }}
        >
          AI chat for the terminal.
        </div>
        {/* CTA */}
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
          {">"} npx assistant-ui create --ink
        </div>
      </div>

      {/* Terminal at bottom center, clipped */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "-420px",
          left: "50%",
          marginLeft: "-260px",
        }}
      >
        <TerminalMockup />
      </div>
    </div>
  );
}
