import { memo } from "react";
import { motion } from "motion/react";
import "./Pitch.css";
import type { MatchEvent, TeamId } from "../types/match";
import { EASE_OUT } from "../motion";

interface PitchProps {
  /** Highlighted events; the last one is treated as the latest moment. */
  events: MatchEvent[];
  homeId: TeamId;
  label: string;
  /** Optional faint layer, e.g. every event so far. */
  trail?: MatchEvent[];
  /** Play a one-shot ripple when the latest event changes. */
  ping?: boolean;
}

// Event coordinates are 0-100 on both axes; the drawing keeps a real pitch ratio.
const X0 = 3, Y0 = 3, W = 100, H = 64;
const px = (x: number) => X0 + (x / 100) * W;
const py = (y: number) => Y0 + (y / 100) * H;

const Markings = memo(function Markings() {
  return (
    <>
      <rect className="pitch-bg" width="106" height="70" rx="3" />
      {Array.from({ length: 5 }, (_, i) => (
        <rect key={i} className="pitch-stripe" x={X0 + i * 20} y={Y0} width="10" height={H} />
      ))}
      <g className="pitch-lines" fill="none">
        <rect x={X0} y={Y0} width={W} height={H} />
        <path d={`M53 ${Y0}V${Y0 + H}`} />
        <circle cx="53" cy="35" r="8.7" />
        <path d={`M${X0} 16H${X0 + 15.7}V54H${X0} M${X0 + W} 16H${X0 + W - 15.7}V54H${X0 + W}`} />
        <path d={`M${X0} 26.4H${X0 + 5.2}V43.6H${X0} M${X0 + W} 26.4H${X0 + W - 5.2}V43.6H${X0 + W}`} />
      </g>
      <circle className="pitch-spot" cx="53" cy="35" r="0.8" />
    </>
  );
});

const Trail = memo(function Trail({ events, homeId }: { events: MatchEvent[]; homeId: TeamId }) {
  return (
    <g className="pitch-trail">
      {events.map((event) => (
        <circle key={event.id} className={event.teamId === homeId ? "is-home" : "is-away"} cx={px(event.x)} cy={py(event.y)} r="0.75" />
      ))}
    </g>
  );
});

/** Pitch with event positions. Static markings and the trail are memoised so scrubbing stays smooth. */
export function Pitch({ events, homeId, label, trail, ping = false }: PitchProps) {
  const last = events.length - 1;
  const latest = events[last];
  return (
    <svg className="pitch" viewBox="0 0 106 70" role="img" aria-label={label}>
      <Markings />
      {trail && <Trail events={trail} homeId={homeId} />}
      {events.map((event, i) => {
        const team = event.teamId === homeId ? "is-home" : "is-away";
        const isLatest = i === last;
        return (
          <g key={event.id}>
            {isLatest && <circle className={`pitch-ring ${team}`} cx={px(event.x)} cy={py(event.y)} r="4.2" />}
            <circle className={`pitch-dot ${team}${isLatest ? " is-latest" : ""}`} cx={px(event.x)} cy={py(event.y)} r={isLatest ? 2.3 : 1.4} />
          </g>
        );
      })}
      {ping && latest && (
        <motion.circle
          key={`ping-${latest.id}`}
          className={`pitch-ping ${latest.teamId === homeId ? "is-home" : "is-away"}`}
          cx={px(latest.x)} cy={py(latest.y)}
          initial={{ r: 2.3, opacity: 0.8 }}
          animate={{ r: 9, opacity: 0 }}
          transition={{ duration: 0.9, ease: EASE_OUT }}
        />
      )}
    </svg>
  );
}
