import { withAui } from "@assistant-ui/next";
import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/renderer",
        headers: [
          {
            key: "Content-Security-Policy",
            value:
              "frame-ancestors https://cloud.assistant-ui.com http://localhost:3001",
          },
        ],
      },
    ];
  },
};

export default withAui(nextConfig);
