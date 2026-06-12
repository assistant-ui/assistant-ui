"use client";

import dynamic from "next/dynamic";

const Terminal = dynamic(() => import("./terminal"), {
  ssr: false,
  loading: () => <div className="terminal-loading">starting terminal...</div>,
});

export default function Home() {
  return <Terminal />;
}
