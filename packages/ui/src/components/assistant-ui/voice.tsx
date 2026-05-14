"use client";

import { TooltipIconButton } from "@/components/assistant-ui/tooltip-icon-button";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  AuiIf,
  useVoiceControls,
  useVoiceState,
  useVoiceVolume,
} from "@assistant-ui/react";
import { MicIcon, MicOffIcon, PhoneIcon, PhoneOffIcon } from "lucide-react";
import { type FC, memo, useCallback, useEffect, useRef, useState } from "react";

export type VoiceOrbState =
  | "idle"
  | "connecting"
  | "listening"
  | "speaking"
  | "muted";

export type VoiceOrbVariant = "default" | "blue" | "violet" | "emerald";

const VARIANT_COLORS: Record<VoiceOrbVariant, [number, number, number][]> = {
  default: [
    [0.55, 0.55, 0.6],
    [0.7, 0.7, 0.75],
    [0.4, 0.4, 0.45],
  ],
  blue: [
    [0.2, 0.5, 1.0],
    [0.4, 0.7, 1.0],
    [0.1, 0.3, 0.8],
  ],
  violet: [
    [0.6, 0.3, 1.0],
    [0.8, 0.5, 1.0],
    [0.4, 0.15, 0.8],
  ],
  emerald: [
    [0.15, 0.75, 0.55],
    [0.3, 0.9, 0.7],
    [0.1, 0.55, 0.4],
  ],
};

type OrbParams = {
  speed: number;
  amplitude: number;
  glow: number;
  brightness: number;
  pulse: number;
  saturation: number;
};

const STATE_PARAMS: Record<VoiceOrbState, OrbParams> = {
  idle: {
    speed: 0.15,
    amplitude: 0.04,
    glow: 0.15,
    brightness: 0.55,
    pulse: 0.0,
    saturation: 0.7,
  },
  connecting: {
    speed: 0.5,
    amplitude: 0.1,
    glow: 0.45,
    brightness: 0.75,
    pulse: 1.0,
    saturation: 0.9,
  },
  listening: {
    speed: 0.4,
    amplitude: 0.14,
    glow: 0.5,
    brightness: 0.85,
    pulse: 0.0,
    saturation: 1.0,
  },
  speaking: {
    speed: 1.4,
    amplitude: 0.35,
    glow: 0.9,
    brightness: 1.0,
    pulse: 0.0,
    saturation: 1.0,
  },
  muted: {
    speed: 0.06,
    amplitude: 0.015,
    glow: 0.08,
    brightness: 0.35,
    pulse: 0.0,
    saturation: 0.2,
  },
};

const VERT_SRC = `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
  v_uv = a_position * 0.5 + 0.5;
  gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const FRAG_SRC = `#version 300 es
precision highp float;

in vec2 v_uv;
out vec4 fragColor;

uniform float u_time;
uniform float u_speed;
uniform float u_amplitude;
uniform float u_glow;
uniform float u_brightness;
uniform float u_pulse;
uniform float u_saturation;
uniform vec3 u_color0;
uniform vec3 u_color1;
uniform vec3 u_color2;
uniform float u_dpr;

// Simplex-like noise (3D)
vec3 mod289(vec3 x) { return x - floor(x / 289.0) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x / 289.0) * 289.0; }
vec4 permute(vec4 x) { return mod289((x * 34.0 + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  vec3 i = floor(v + dot(v, vec3(C.y)));
  vec3 x0 = v - i + dot(i, vec3(C.x));
  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g, l.zxy);
  vec3 i2 = max(g, l.zxy);
  vec3 x1 = x0 - i1 + C.x;
  vec3 x2 = x0 - i2 + C.y;
  vec3 x3 = x0 - 0.5;
  i = mod289(i);
  vec4 p = permute(permute(permute(
    i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));
  vec4 j = p - 49.0 * floor(p / 49.0);
  vec4 x_ = floor(j / 7.0);
  vec4 y_ = floor(j - 7.0 * x_);
  vec4 x = (x_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 y = (y_ * 2.0 + 0.5) / 7.0 - 1.0;
  vec4 h = 1.0 - abs(x) - abs(y);
  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);
  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));
  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
  vec3 g0 = vec3(a0.xy, h.x);
  vec3 g1 = vec3(a0.zw, h.y);
  vec3 g2 = vec3(a1.xy, h.z);
  vec3 g3 = vec3(a1.zw, h.w);
  vec4 norm = taylorInvSqrt(vec4(dot(g0,g0), dot(g1,g1), dot(g2,g2), dot(g3,g3)));
  g0 *= norm.x; g1 *= norm.y; g2 *= norm.z; g3 *= norm.w;
  vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(g0,x0), dot(g1,x1), dot(g2,x2), dot(g3,x3)));
}

void main() {
  vec2 uv = v_uv * 2.0 - 1.0;
  float dist = length(uv);
  float t = u_time * u_speed;

  // Perfect circle — hard boundary, soft anti-aliased edge
  float radius = 0.44;
  float circle = 1.0 - smoothstep(radius - 0.008, radius + 0.008, dist);

  if (circle < 0.001) {
    // Outer glow only
    float glowDist = dist - radius;
    float glow = exp(-glowDist * 12.0) * u_glow * 0.4;
    vec3 glowColor = mix(u_color0, u_color1, 0.5);
    fragColor = vec4(glowColor * glow, glow);
    return;
  }

  float n1 = snoise(vec3(uv * 2.0, t * 0.6)) * 0.5 + 0.5;
  float n2 = snoise(vec3(uv * 3.5 + 7.0, t * 0.9)) * 0.5 + 0.5;
  float n3 = snoise(vec3(uv * 1.5 - 3.0, t * 0.4 + 10.0)) * 0.5 + 0.5;

  vec2 distort = vec2(
    snoise(vec3(uv * 2.0 + 5.0, t * 0.7)),
    snoise(vec3(uv * 2.0 + 15.0, t * 0.7))
  ) * u_amplitude * 2.0;
  float n4 = snoise(vec3((uv + distort) * 3.0, t * 0.5)) * 0.5 + 0.5;

  vec3 col = mix(u_color0, u_color1, n1);
  col = mix(col, u_color2, n2 * 0.5);
  col = mix(col, u_color1 * 1.3, n4 * 0.4);

  float vein = pow(n3, 3.0) * u_amplitude * 6.0;
  col += vein * mix(u_color1, vec3(1.0), 0.3);

  float centerDist = dist / radius;
  float depthShade = 1.0 - centerDist * centerDist * 0.4;
  col *= depthShade;

  float rim = pow(centerDist, 4.0) * 0.6;
  col += rim * mix(u_color0, vec3(1.0), 0.5);

  vec2 lightPos = vec2(-0.15, -0.18);
  float specDist = length(uv - lightPos);
  float spec = exp(-specDist * specDist * 30.0) * 0.7;
  col += spec * vec3(1.0);

  vec2 lightPos2 = vec2(0.2, 0.25);
  float spec2 = exp(-length(uv - lightPos2) * 8.0) * 0.15;
  col += spec2 * u_color1;

  float pulseFactor = 1.0 + u_pulse * sin(u_time * 3.5) * 0.35;

  float lum = dot(col, vec3(0.299, 0.587, 0.114));
  col = mix(vec3(lum), col, u_saturation);

  col *= u_brightness * pulseFactor;

  fragColor = vec4(col, circle);
}`;

function createShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }
  return shader;
}

function initWebGL(canvas: HTMLCanvasElement) {
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: false,
    antialias: true,
  });
  if (!gl) return null;

  const vs = createShader(gl, gl.VERTEX_SHADER, VERT_SRC);
  const fs = createShader(gl, gl.FRAGMENT_SHADER, FRAG_SRC);
  if (!vs || !fs) return null;

  const program = gl.createProgram()!;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return null;
  // biome-ignore lint/correctness/useHookAtTopLevel: intentional conditional/nested hook usage
  gl.useProgram(program);

  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW,
  );
  const loc = gl.getAttribLocation(program, "a_position");
  gl.enableVertexAttribArray(loc);
  gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  const uniforms = {
    u_time: gl.getUniformLocation(program, "u_time"),
    u_speed: gl.getUniformLocation(program, "u_speed"),
    u_amplitude: gl.getUniformLocation(program, "u_amplitude"),
    u_glow: gl.getUniformLocation(program, "u_glow"),
    u_brightness: gl.getUniformLocation(program, "u_brightness"),
    u_pulse: gl.getUniformLocation(program, "u_pulse"),
    u_saturation: gl.getUniformLocation(program, "u_saturation"),
    u_color0: gl.getUniformLocation(program, "u_color0"),
    u_color1: gl.getUniformLocation(program, "u_color1"),
    u_color2: gl.getUniformLocation(program, "u_color2"),
    u_dpr: gl.getUniformLocation(program, "u_dpr"),
  };

  return { gl, uniforms };
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

export type VoiceOrbProps = {
  state?: VoiceOrbState;
  variant?: VoiceOrbVariant;
  className?: string;
};

export function deriveVoiceOrbState(
  voiceState: ReturnType<typeof useVoiceState>,
): VoiceOrbState {
  if (!voiceState) return "idle";
  if (voiceState.status.type === "starting") return "connecting";
  if (voiceState.status.type === "ended") return "idle";
  if (voiceState.isMuted) return "muted";
  if (voiceState.mode === "speaking") return "speaking";
  return "listening";
}

export const VoiceOrb: FC<VoiceOrbProps> = memo(
  ({ state: stateProp, variant = "default", className }) => {
    const voiceState = useVoiceState();
    const state = stateProp ?? deriveVoiceOrbState(voiceState);
    const volume = useVoiceVolume();
    const volumeRef = useRef(0);
    volumeRef.current = volume;
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const glRef = useRef<ReturnType<typeof initWebGL>>(null);
    const animRef = useRef(0);
    const startTime = useRef(performance.now());

    const currentParams = useRef({ ...STATE_PARAMS.idle });
    const targetParams = useRef({ ...STATE_PARAMS.idle });

    useEffect(() => {
      targetParams.current = { ...STATE_PARAMS[state] };
    }, [state]);

    const colors = VARIANT_COLORS[variant];

    const [ready, setReady] = useState(false);
    useEffect(() => {
      const id = requestAnimationFrame(() => setReady(true));
      return () => {
        cancelAnimationFrame(id);
        setReady(false);
      };
    }, []);

    const render = useCallback(() => {
      const ctx = glRef.current;
      if (!ctx) return;
      const { gl, uniforms } = ctx;
      const canvas = canvasRef.current;
      if (!canvas) return;

      const p = currentParams.current;
      const tp = targetParams.current;
      const s = 0.045;
      p.speed = lerp(p.speed, tp.speed, s);
      p.amplitude = lerp(p.amplitude, tp.amplitude, s);
      p.glow = lerp(p.glow, tp.glow, s);
      p.brightness = lerp(p.brightness, tp.brightness, s);
      p.pulse = lerp(p.pulse, tp.pulse, s);
      p.saturation = lerp(p.saturation, tp.saturation, s);

      const elapsed = (performance.now() - startTime.current) / 1000;

      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.getBoundingClientRect();
      const w = Math.round(rect.width * dpr);
      const h = Math.round(rect.height * dpr);
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
      }
      gl.viewport(0, 0, w, h);

      gl.clearColor(0, 0, 0, 0);
      gl.clear(gl.COLOR_BUFFER_BIT);

      const vol = volumeRef.current;

      gl.uniform1f(uniforms.u_time, elapsed);
      gl.uniform1f(uniforms.u_speed, p.speed + vol * 0.4);
      gl.uniform1f(uniforms.u_amplitude, p.amplitude + vol * 0.12);
      gl.uniform1f(uniforms.u_glow, p.glow + vol * 0.2);
      gl.uniform1f(uniforms.u_brightness, p.brightness);
      gl.uniform1f(uniforms.u_pulse, p.pulse);
      gl.uniform1f(uniforms.u_saturation, p.saturation);
      gl.uniform3fv(uniforms.u_color0, colors[0]!);
      gl.uniform3fv(uniforms.u_color1, colors[1]!);
      gl.uniform3fv(uniforms.u_color2, colors[2]!);
      gl.uniform1f(uniforms.u_dpr, dpr);

      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

      animRef.current = requestAnimationFrame(render);
    }, [colors]);

    useEffect(() => {
      if (!ready) return;
      const canvas = canvasRef.current;
      if (!canvas) return;

      glRef.current = initWebGL(canvas);
      if (!glRef.current) return;

      animRef.current = requestAnimationFrame(render);

      return () => {
        cancelAnimationFrame(animRef.current);
        const ctx = glRef.current;
        if (ctx) {
          const ext = ctx.gl.getExtension("WEBGL_lose_context");
          ext?.loseContext();
        }
        glRef.current = null;
      };
    }, [ready, render]);

    return (
      <canvas
        ref={canvasRef}
        className={cn("aui-voice-orb size-16 shrink-0", className)}
        data-state={state}
      />
    );
  },
);

VoiceOrb.displayName = "VoiceOrb";

export const VoiceControl: FC<{ className?: string }> = ({ className }) => {
  return (
    <div
      className={cn(
        "aui-voice-control flex items-center gap-2 border-b px-4 py-2",
        className,
      )}
    >
      <VoiceStatusDot />

      <AuiIf
        condition={(s) =>
          s.thread.voice == null || s.thread.voice.status.type === "ended"
        }
      >
        <VoiceConnectButton />
      </AuiIf>

      <AuiIf condition={(s) => s.thread.voice?.status.type === "starting"}>
        <span className="aui-voice-status text-muted-foreground text-sm">
          Connecting...
        </span>
      </AuiIf>

      <AuiIf condition={(s) => s.thread.voice?.status.type === "running"}>
        <VoiceMuteButton />
        <VoiceDisconnectButton />
      </AuiIf>
    </div>
  );
};

export const VoiceStatusDot: FC = () => {
  const voiceState = useVoiceState();
  const state = deriveVoiceOrbState(voiceState);

  return (
    <span
      className={cn(
        "aui-voice-status-dot size-2.5 shrink-0 rounded-full transition-all duration-300",
        state === "idle" && "bg-muted-foreground",
        state === "connecting" && "animate-pulse bg-amber-500",
        state === "listening" && "bg-green-500",
        state === "speaking" && "bg-green-500",
        state === "muted" && "bg-destructive",
      )}
    />
  );
};

export const VoiceConnectButton: FC = () => {
  const { connect } = useVoiceControls();
  return (
    <Button
      variant="default"
      size="sm"
      className="aui-voice-connect gap-1.5 rounded-lg"
      onClick={() => connect()}
    >
      <PhoneIcon className="size-4" />
      Connect
    </Button>
  );
};

export const VoiceMuteButton: FC = () => {
  const voiceState = useVoiceState();
  const { mute, unmute } = useVoiceControls();
  const isMuted = voiceState?.isMuted ?? false;

  return (
    <TooltipIconButton
      tooltip={isMuted ? "Unmute" : "Mute"}
      className="aui-voice-mute"
      onClick={() => (isMuted ? unmute() : mute())}
    >
      {isMuted ? <MicOffIcon /> : <MicIcon />}
    </TooltipIconButton>
  );
};

export const VoiceDisconnectButton: FC = () => {
  const { disconnect } = useVoiceControls();
  return (
    <TooltipIconButton
      tooltip="Disconnect"
      className="aui-voice-disconnect text-destructive hover:text-destructive"
      onClick={() => disconnect()}
    >
      <PhoneOffIcon />
    </TooltipIconButton>
  );
};
