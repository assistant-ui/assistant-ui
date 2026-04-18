const BLUE = "#0a84ff";
const GRAY_BUBBLE = "rgba(44, 44, 46, 0.9)";
const _GRAY_TEXT = "#8e8e93";
const ORANGE = "#ff6b2b";
const BORDER = "#3a3a3c";

function PhoneMockup() {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        width: "440px",
        height: "900px",
        borderRadius: "56px",
        border: "8px solid #2c2c2e",
        background: "#000",
        overflow: "hidden",
        flexShrink: 0,
        boxShadow:
          "0 0 0 1.5px #444, inset 0 0 0 1.5px #1a1a1a, 0 20px 60px rgba(0,0,0,0.5)",
      }}
    >
      {/* Top bezel spacer */}
      <div style={{ display: "flex", height: "40px" }} />

      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "14px 24px",
        }}
      >
        {/* Hamburger icon */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "4px",
            width: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              height: "2px",
              background: "white",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              display: "flex",
              height: "2px",
              background: "white",
              borderRadius: "1px",
            }}
          />
          <div
            style={{
              display: "flex",
              height: "2px",
              background: "white",
              borderRadius: "1px",
            }}
          />
        </div>

        <div style={{ fontSize: "18px", fontWeight: 700, color: "white" }}>
          assistant-ui
        </div>

        {/* New chat button */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: "28px",
            height: "28px",
            borderRadius: "8px",
            border: `1.5px solid ${BORDER}`,
          }}
        >
          <svg
            aria-hidden="true"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="white"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 20h9" />
            <path d="M16.376 3.622a1 1 0 0 1 3.002 3.002L7.368 18.635a2 2 0 0 1-.855.506l-2.872.838a.5.5 0 0 1-.62-.62l.838-2.872a2 2 0 0 1 .506-.854z" />
          </svg>
        </div>
      </div>

      {/* Messages */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          padding: "16px 20px",
          gap: "12px",
        }}
      >
        {/* User message */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: BLUE,
              color: "white",
              padding: "11px 16px",
              borderRadius: "20px 20px 4px 20px",
              fontSize: "15px",
              lineHeight: 1.4,
              maxWidth: "85%",
            }}
          >
            How do I set up navigation in React Native?
          </div>
        </div>

        {/* Assistant message */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              background: GRAY_BUBBLE,
              color: "white",
              padding: "11px 16px",
              borderRadius: "20px 20px 20px 4px",
              fontSize: "15px",
              lineHeight: 1.4,
              maxWidth: "85%",
            }}
          >
            You can use React Navigation! First, install the core package and a
            navigator like stack or tabs.
          </div>
        </div>

        {/* User message 2 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
          }}
        >
          <div
            style={{
              background: BLUE,
              color: "white",
              padding: "11px 16px",
              borderRadius: "20px 20px 4px 20px",
              fontSize: "15px",
              lineHeight: 1.4,
              maxWidth: "85%",
            }}
          >
            Show me a code example
          </div>
        </div>

        {/* Assistant message 2 */}
        <div
          style={{
            display: "flex",
            justifyContent: "flex-start",
          }}
        >
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              background: GRAY_BUBBLE,
              color: "white",
              padding: "11px 16px",
              borderRadius: "20px 20px 20px 4px",
              fontSize: "15px",
              lineHeight: 1.4,
              maxWidth: "85%",
              gap: "8px",
            }}
          >
            <div style={{ display: "flex" }}>Here&apos;s a basic setup:</div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                background: "rgba(0,0,0,0.4)",
                borderRadius: "8px",
                padding: "8px 10px",
                fontSize: "11px",
                lineHeight: 1.5,
                fontFamily: "monospace",
                gap: "2px",
              }}
            >
              <div style={{ display: "flex", color: "#ff7b72" }}>
                {"import { NavigationContainer }"}
              </div>
              <div style={{ display: "flex", color: "#ff7b72" }}>
                {"  from '@react-navigation/native';"}
              </div>
              <div style={{ display: "flex", color: "#c9d1d9" }}>
                {"function App() {"}
              </div>
              <div style={{ display: "flex", color: "#c9d1d9" }}>
                {"  return ("}
              </div>
              <div style={{ display: "flex", color: "#7ee787" }}>
                {"    <NavigationContainer>"}
              </div>
              <div style={{ display: "flex", color: "#7ee787" }}>
                {"      <Stack.Navigator />"}
              </div>
              <div style={{ display: "flex", color: "#7ee787" }}>
                {"    </NavigationContainer>"}
              </div>
              <div style={{ display: "flex", color: "#c9d1d9" }}>{"  );}"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function ReactNativeLaunch() {
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
              color: ORANGE,
            }}
          >
            react-native
          </div>
        </div>
        <div
          style={{
            fontSize: "44px",
            opacity: 0.6,
            lineHeight: 1.4,
          }}
        >
          The UX of ChatGPT in your mobile app.
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
          {">"} npx assistant-ui create --native
        </div>
      </div>

      {/* Phone at bottom center, heavily clipped - only top visible */}
      <div
        style={{
          display: "flex",
          position: "absolute",
          bottom: "-700px",
          left: "50%",
          marginLeft: "-220px",
        }}
      >
        <PhoneMockup />
      </div>
    </div>
  );
}
