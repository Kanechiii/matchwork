import { useId, type CSSProperties, type ReactNode } from "react";
import type { Team } from "../types/match";
import "./TeamCrest.css";

type Motif = "bridge" | "anchor" | "cedar" | "peak" | "sun" | "tower";
type Shape = "shield" | "round" | "hex" | "badge";
export type CrestSize = "xs" | "sm" | "md" | "lg" | "xl";

const SHAPES: Record<Shape, string> = {
  shield: "M32 3 L57 11 V30 C57 45.5 46.5 55.5 32 61 C17.5 55.5 7 45.5 7 30 V11 Z",
  round: "M3 32 A29 29 0 1 1 61 32 A29 29 0 1 1 3 32 Z",
  hex: "M32 3 L57 17.5 V46.5 L32 61 L7 46.5 V17.5 Z",
  badge: "M12 5 H52 Q58 5 58 11 V31 C58 45 47 55.5 32 61 C17 55.5 6 45 6 31 V11 Q6 5 12 5 Z",
};

// Each fictional club gets an emblem that echoes its synthetic name.
const CLUBS: Record<string, { motif: Motif; shape: Shape }> = {
  northbridge: { motif: "bridge", shape: "shield" },
  harborpoint: { motif: "anchor", shape: "round" },
  cedarvale: { motif: "cedar", shape: "badge" },
  ironcrest: { motif: "peak", shape: "hex" },
  westmere: { motif: "sun", shape: "round" },
  stonehaven: { motif: "tower", shape: "shield" },
};
const MOTIFS: Motif[] = ["bridge", "anchor", "cedar", "peak", "sun", "tower"];
const SHAPE_KEYS: Shape[] = ["shield", "round", "hex", "badge"];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/** Light or dark emblem ink, picked from the club colour's relative luminance. */
function inkFor(color: string): "light" | "dark" {
  const match = /^#?([0-9a-f]{6})$/i.exec(color);
  if (!match) return "light";
  const n = parseInt(match[1], 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b > 0.4 ? "dark" : "light";
}

const WAVE = "q4 -2.6 8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0 t8 0";
const star = (cx: number, cy: number, r: number) =>
  `M${cx} ${cy - r} L${cx + r * 0.24} ${cy - r * 0.24} L${cx + r} ${cy} L${cx + r * 0.24} ${cy + r * 0.24} L${cx} ${cy + r} L${cx - r * 0.24} ${cy + r * 0.24} L${cx - r} ${cy} L${cx - r * 0.24} ${cy - r * 0.24} Z`;
const SUN_RAYS = [-165, -140, -115, -90, -65, -40, -15].map((deg) => {
  const a = (deg * Math.PI) / 180;
  const p = (r: number) => `${(32 + r * Math.cos(a)).toFixed(2)} ${(37 + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(16.5)} L${p(22)}`;
});

function MotifArt({ motif }: { motif: Motif }): ReactNode {
  switch (motif) {
    case "bridge":
      return (
        <>
          <path className="crest-ink crest-twinkle" d={star(32, 15, 5.5)} />
          <path className="crest-line" strokeWidth="3.2" d="M13 41 Q32 18 51 41" />
          <path className="crest-line" strokeWidth="3" d="M11 41 H53" />
          <path className="crest-line" strokeWidth="1.4" d="M21 41 V33.4 M26.5 41 V30.5 M32 41 V29.5 M37.5 41 V30.5 M43 41 V33.4" />
          <g className="crest-waves">
            <path className="crest-line crest-soft" strokeWidth="1.8" d={`M-16 48 ${WAVE}`} />
            <path className="crest-line crest-soft" strokeWidth="1.6" d={`M-12 53.5 ${WAVE}`} />
          </g>
        </>
      );
    case "anchor":
      return (
        <>
          <g className="crest-sway">
            <circle className="crest-line" strokeWidth="2.6" cx="32" cy="16" r="4" />
            <path className="crest-line" strokeWidth="3" d="M32 20 V49 M23.5 26 H40.5" />
            <path className="crest-line" strokeWidth="3" d="M17.5 37 Q19.5 50 32 50 Q44.5 50 46.5 37" />
            <path className="crest-ink" d="M14.2 39.6 L17.4 33.6 L21 39 Z M49.8 39.6 L46.6 33.6 L43 39 Z" />
          </g>
          <g className="crest-waves">
            <path className="crest-line crest-soft" strokeWidth="1.8" d={`M-14 56.5 ${WAVE}`} />
          </g>
        </>
      );
    case "cedar":
      return (
        <>
          <g className="crest-tree">
            <path className="crest-ink" d="M32 11 L41.5 24 H22.5 Z M32 19 L45 34 H19 Z M32 28 L49 45 H15 Z" />
            <rect className="crest-ink" x="29.3" y="44.5" width="5.4" height="8.5" rx="1" />
          </g>
          <path className="crest-line crest-soft" strokeWidth="1.6" d="M19 54 H45" />
        </>
      );
    case "peak":
      return (
        <>
          <path className="crest-ink crest-twinkle" d={star(39, 13, 4.6)} />
          <path className="crest-ink" d="M9 47 L24 25 L31 35 L39 21 L55 47 Z" />
          <path className="crest-ridge" d="M24 25 L27.5 36 M39 21 L35.2 33.5" />
          <rect className="crest-ink crest-soft" x="15" y="50.5" width="34" height="3.2" rx="1.6" />
        </>
      );
    case "sun":
      return (
        <>
          <g className="crest-rays">
            {SUN_RAYS.map((d) => <path key={d} className="crest-line" strokeWidth="2.2" d={d} />)}
          </g>
          <path className="crest-ink" d="M19 37 A13 13 0 0 1 45 37 Z" />
          <g className="crest-shimmer">
            <path className="crest-line" strokeWidth="2.4" d="M14 42.5 H50" />
            <path className="crest-line crest-soft" strokeWidth="2.2" d="M19 47.5 H45" />
            <path className="crest-line crest-soft" strokeWidth="2" d="M24 52.5 H40" />
          </g>
        </>
      );
    case "tower":
      return (
        <>
          <path className="crest-line" strokeWidth="1.6" d="M32 21 V8.5" />
          <path className="crest-ink crest-flag" d="M32 8.6 Q37 7.4 42 9.4 Q38.6 11.3 42 13.4 Q37 12.3 32 13.9 Z" />
          <path className="crest-ink" d="M21 21 H25.4 V24.4 H29.8 V21 H34.2 V24.4 H38.6 V21 H43 V29 H21 Z" />
          <rect className="crest-ink" x="23" y="29" width="18" height="21" />
          <path className="crest-cut" d="M28.6 50 V43.6 A3.4 3.4 0 0 1 35.4 43.6 V50 Z" />
          <rect className="crest-cut" x="30.4" y="32.5" width="3.2" height="5.2" rx="1.6" />
          <rect className="crest-ink" x="17" y="49.5" width="30" height="4" rx="1" />
        </>
      );
  }
}

interface TeamCrestProps {
  team: Pick<Team, "id" | "name" | "color">;
  size?: CrestSize;
  className?: string;
  /** Accessible name. Omit when the club name is already visible next to the crest. */
  label?: string;
}

/** Synthetic, animated club emblem generated from fictional team data. */
export function TeamCrest({ team, size = "md", className = "", label }: TeamCrestProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const h = hash(team.id);
  const style = CLUBS[team.id] ?? { motif: MOTIFS[h % MOTIFS.length], shape: SHAPE_KEYS[(h >>> 4) % SHAPE_KEYS.length] };
  const shape = SHAPES[style.shape];
  const vars = { "--crest": team.color, "--crest-delay": `${((h >>> 8) % 50) / 10}s` } as CSSProperties;
  return (
    <svg className={`team-crest is-${size} is-${inkFor(team.color)} ${className}`} viewBox="0 0 64 64" style={vars}
      role={label ? "img" : undefined} aria-label={label} aria-hidden={label ? undefined : true} focusable="false">
      <defs>
        <linearGradient id={`${uid}-fill`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" className="crest-stop-hi" />
          <stop offset="1" className="crest-stop-lo" />
        </linearGradient>
        <clipPath id={`${uid}-clip`}><path d={shape} /></clipPath>
      </defs>
      <path d={shape} fill={`url(#${uid}-fill)`} />
      <g clipPath={`url(#${uid}-clip)`}>
        <MotifArt motif={style.motif} />
        <g transform="rotate(24 32 32)"><rect className="crest-shine" x="-26" y="-20" width="10" height="104" /></g>
      </g>
      <path className="crest-trim" d={shape} transform="translate(32 32) scale(0.86) translate(-32 -32)" />
      <path className="crest-edge" d={shape} />
    </svg>
  );
}
