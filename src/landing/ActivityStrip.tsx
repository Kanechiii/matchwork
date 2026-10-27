import { memo } from "react";
import { motion } from "motion/react";
import type { MatchEvent, TeamId } from "../types/match";
import { EASE_OUT } from "../motion";
import type { MinuteBin } from "./sample";

interface ActivityStripProps {
  bins: MinuteBin[];
  max: number;
  goals: MatchEvent[];
  homeId: TeamId;
  duration: number;
  time: number;
  /** Optional [start, end] seconds to highlight, e.g. the three-minute feature window. */
  window?: [number, number];
  label: string;
  tall?: boolean;
  /** When provided, goal markers become buttons that jump to the goal. */
  onSeek?: (seconds: number) => void;
  formatTime?: (seconds: number) => string;
}

const BAR = 10; // viewBox units per minute
const MID = 40;
const REACH = 34;

const Bars = memo(function Bars({ bins, max, visibleMinutes }: { bins: MinuteBin[]; max: number; visibleMinutes: number }) {
  return (
    <g>
      {bins.map((bin, m) => {
        const shown = m < visibleMinutes;
        const hh = Math.max(1, (bin.home / max) * REACH);
        const ah = Math.max(1, (bin.away / max) * REACH);
        return (
          <g key={m}>
            <rect className={`strip-bar is-home${shown ? " is-shown" : ""}`} x={m * BAR + 1.5} y={MID - 1 - hh} width={BAR - 3} height={hh} rx="1.5" style={{ transitionDelay: `${(m % 6) * 12}ms` }} />
            <rect className={`strip-bar is-away${shown ? " is-shown" : ""}`} x={m * BAR + 1.5} y={MID + 1} width={BAR - 3} height={ah} rx="1.5" style={{ transitionDelay: `${(m % 6) * 12}ms` }} />
          </g>
        );
      })}
    </g>
  );
});

/** Events per minute for each side: home above the line, away below. Grows from the baseline as the clock passes. */
export function ActivityStrip({ bins, max, goals, homeId, duration, time, window, label, tall = false, onSeek, formatTime = String }: ActivityStripProps) {
  const width = bins.length * BAR;
  const toX = (seconds: number) => (seconds / duration) * width;
  const visibleMinutes = Math.ceil(time / 60);
  return (
    <div className={`strip-wrap${tall ? " is-tall" : ""}`}>
      <svg className="strip" viewBox={`0 0 ${width} 80`} preserveAspectRatio="none" role="img" aria-label={label}>
        {window && (
          <motion.rect className="strip-window" y="0" height="80" rx="3"
            initial={false} animate={{ x: toX(window[0]), width: Math.max(4, toX(window[1]) - toX(window[0])) }}
            transition={{ duration: 0.6, ease: EASE_OUT }} />
        )}
        <line className="strip-mid" x1="0" x2={width} y1={MID} y2={MID} />
        <line className="strip-half" x1={width / 2} x2={width / 2} y1="2" y2="78" />
        <Bars bins={bins} max={max} visibleMinutes={visibleMinutes} />
        <line className="strip-head" x1={toX(time)} x2={toX(time)} y1="0" y2="80" />
      </svg>
      {goals.map((goal) => {
        const team = goal.teamId === homeId ? "is-home" : "is-away";
        const className = `strip-goal ${team}${goal.elapsedSeconds <= time ? " is-shown" : ""}`;
        const left = `${(100 * goal.elapsedSeconds) / duration}%`;
        return onSeek ? (
          <button key={goal.id} type="button" className={`${className} is-button`} style={{ left }} onClick={() => onSeek(goal.elapsedSeconds)}
            aria-label={`Jump to the ${team === "is-home" ? "home" : "away"} goal at ${formatTime(goal.elapsedSeconds)}`} title={`Goal ${formatTime(goal.elapsedSeconds)}`} />
        ) : <span key={goal.id} className={className} style={{ left }} aria-hidden="true" />;
      })}
    </div>
  );
}
