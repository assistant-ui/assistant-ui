"use client";

import { useCallback, useEffect, useMemo, useRef } from "react";
import { FrameHost } from "./FrameHost";
import { DEFAULT_FRAME_URL } from "./constants";

export interface DevToolsFrameProps {
  frameUrl?: string;
  className?: string;
  style?: React.CSSProperties;
  title?: string;
}

export const DevToolsFrame: React.FC<DevToolsFrameProps> = ({
  frameUrl = DEFAULT_FRAME_URL,
  className,
  style,
  title = "assistant-ui DevTools",
}) => {
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const frameHostRef = useRef<FrameHost | null>(null);

  const resolvedFrameUrl = useMemo(() => frameUrl, [frameUrl]);

  const handleFrameLoad = useCallback(() => {
    if (frameHostRef.current) {
      frameHostRef.current.destroy();
      frameHostRef.current = null;
    }

    if (iframeRef.current) {
      frameHostRef.current = new FrameHost(iframeRef.current);
    }
  }, []);

  useEffect(() => {
    return () => {
      if (frameHostRef.current) {
        frameHostRef.current.destroy();
        frameHostRef.current = null;
      }
    };
  }, []);

  return (
    <iframe
      ref={iframeRef}
      src={resolvedFrameUrl}
      onLoad={handleFrameLoad}
      className={className}
      style={style}
      title={title}
    />
  );
};
