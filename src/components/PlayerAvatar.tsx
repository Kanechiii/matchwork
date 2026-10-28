import { useId, type CSSProperties, type ReactNode } from "react";
import type { Position } from "../types/match";
import "./PlayerAvatar.css";

type HairStyle = "short" | "buzz" | "curly" | "quiff" | "bun" | "flat";
export type AvatarSize = "sm" | "md" | "lg" | "xl";

// Illustration palettes. Every fictional player maps to one deterministic look.
const SKIN = ["#f5d0b0", "#ecbc94", "#d6a06d", "#b57a48", "#8a5a32", "#5f3b22"];
const HAIR = ["#1d1814", "#3a281c", "#6a4325", "#a06c34", "#d3ae6c", "#4a4a4a"];
const STYLES: HairStyle[] = ["short", "buzz", "curly", "quiff", "bun", "flat"];

function hash(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i += 1) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function Hair({ style }: { style: HairStyle }): ReactNode {
  switch (style) {
    case "short":
      return <path className="av-hair" d="M20.6 26 C19.8 17 25 13 32 13 C39 13 44.2 17 43.4 26 C42 21.5 39 19.4 32 19.4 C25 19.4 22 21.5 20.6 26 Z" />;
    case "buzz":
      return <path className="av-hair is-buzz" d="M21.2 23.5 C21.5 17 26 14 32 14 C38 14 42.5 17 42.8 23.5 C40 20.5 36 19.6 32 19.6 C28 19.6 24 20.5 21.2 23.5 Z" />;
    case "curly":
      return (
        <g className="av-hair">
          <circle cx="22.2" cy="21.5" r="4" /><circle cx="26.2" cy="16.8" r="4.4" /><circle cx="32" cy="14.8" r="4.6" />
          <circle cx="37.8" cy="16.8" r="4.4" /><circle cx="41.8" cy="21.5" r="4" />
        </g>
      );
    case "quiff":
      return <path className="av-hair" d="M20.6 25 C19.6 16 24.5 11.5 31 11.5 C36 9 44 11 44.6 17 C45 20 43.8 23 43.4 25 C41.5 20.6 37.5 18.8 32 19 C26 19.2 22.4 21 20.6 25 Z" />;
    case "bun":
      return (
        <g className="av-hair">
          <circle cx="32" cy="10.6" r="4.2" />
          <path d="M20.6 26 C19.8 17 25 13 32 13 C39 13 44.2 17 43.4 26 C42 21.5 39 19.4 32 19.4 C25 19.4 22 21.5 20.6 26 Z" />
        </g>
      );
    case "flat":
      return <path className="av-hair" d="M21 24 V17.5 Q21 13.5 25 13.5 H39 Q43 13.5 43 17.5 V24 C40.5 21 37 20 32 20 C27 20 23.5 21 21 24 Z" />;
  }
}

interface PlayerAvatarProps {
  playerId: string;
  kitColor: string;
  position: Position | string;
  number: number;
  size?: AvatarSize;
  className?: string;
}

/** Synthetic, animated 2D player portrait. Same player ID always draws the same face. */
export function PlayerAvatar({ playerId, kitColor, position, number, size = "md", className = "" }: PlayerAvatarProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const h = hash(playerId);
  const hairStyle = STYLES[(h >>> 6) % STYLES.length];
  const beard = (h >>> 9) % 4 === 0;
  const band = (h >>> 11) % 5 === 0 && hairStyle !== "bun";
  const vars = {
    "--kit": kitColor,
    "--skin": SKIN[h % SKIN.length],
    "--hair": HAIR[(h >>> 3) % HAIR.length],
    "--av-delay": `${((h >>> 13) % 40) / 10}s`,
  } as CSSProperties;
  const showNumber = size === "lg" || size === "xl";
  return (
    <svg className={`player-avatar is-${size} ${className}`} viewBox="0 0 64 64" style={vars} aria-hidden="true" focusable="false">
      <defs><clipPath id={`${uid}-clip`}><circle cx="32" cy="32" r="32" /></clipPath></defs>
      <g clipPath={`url(#${uid}-clip)`}>
        <rect className="av-bg" width="64" height="64" />
        <circle className="av-halo" cx="32" cy="29" r="21" />
        <g className="av-figure">
          <path className={`av-shirt${position === "GK" ? " is-gk" : ""}`} d="M8 66 C8 52 18 45.5 32 45.5 C46 45.5 56 52 56 66 Z" />
          <path className="av-collar" d="M26.5 46 L32 52.5 L37.5 46" />
          {showNumber && <text className="av-number" x="32" y="62">{number}</text>}
          <rect className="av-neck" x="28" y="36.5" width="8" height="10.5" rx="3" />
          <g className="av-head">
            <circle className="av-skin" cx="20.6" cy="28" r="2.6" />
            <circle className="av-skin" cx="43.4" cy="28" r="2.6" />
            <ellipse className="av-skin" cx="32" cy="27" rx="11.2" ry="12.6" />
            {beard && <path className="av-beard" d="M21.5 29 C22 37.5 27 40.5 32 40.5 C37 40.5 42 37.5 42.5 29 C40 33.5 36.5 34.6 32 34.6 C27.5 34.6 24 33.5 21.5 29 Z" />}
            <Hair style={hairStyle} />
            {band && <path className="av-band" d="M20.8 21 Q32 15.5 43.2 21 L43.2 23.6 Q32 18.2 20.8 23.6 Z" />}
            <path className="av-brow" d="M25.6 23.4 Q28 22.1 30 23.1 M34 23.1 Q36 22.1 38.4 23.4" />
            <g className="av-eyes"><ellipse cx="28" cy="27.4" rx="1.35" ry="1.7" /><ellipse cx="36" cy="27.4" rx="1.35" ry="1.7" /></g>
            <path className="av-nose" d="M32 28.6 Q33.4 31.4 31.6 31.9" />
            <path className="av-mouth" d="M28.8 34 Q32 36.4 35.2 34" />
            <circle className="av-cheek" cx="25" cy="31.6" r="1.8" />
            <circle className="av-cheek" cx="39" cy="31.6" r="1.8" />
          </g>
        </g>
      </g>
    </svg>
  );
}
