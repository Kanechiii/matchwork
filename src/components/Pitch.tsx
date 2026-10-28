import { memo, type CSSProperties, type KeyboardEvent, type MouseEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import "./Pitch.css";
import type { MatchEvent, TeamId } from "../types/match";
import { EASE_OUT } from "../motion";
import { H, W, X0, Y0, px, py } from "./pitchGeometry";

interface PitchProps {
  /** Highlighted events; the last one is treated as the latest moment. */
  events: MatchEvent[];
  homeId: TeamId;
  label: string;
  /** Optional faint layer, e.g. every event so far. */
  trail?: MatchEvent[];
  /** Play a one-shot ripple when the latest event changes. */
  ping?: boolean;
  /** Connect highlighted events in order to show the ball's recent path. */
  path?: boolean;
  /** Older highlighted events shrink and fade by recency. */
  fade?: boolean;
  /** Event to emphasise, e.g. the hovered or pinned dot. */
  activeId?: string | null;
  /** When set, dots become focusable and report hover/focus. */
  onHover?: (id: string | null) => void;
  /** Dot click / Enter. Clicking empty pitch reports null. */
  onSelect?: (id: string | null) => void;
  /** Accessible name for an interactive dot. */
  describe?: (event: MatchEvent) => string;
}

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
export function Pitch({ events, homeId, label, trail, ping = false, path = false, fade = false, activeId = null, onHover, onSelect, describe }: PitchProps) {
  const last = events.length - 1;
  const latest = events[last];
  const interactive = Boolean(onHover || onSelect);
  const active = activeId ? events.find((event) => event.id === activeId) : undefined;
  const onDotKey = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onSelect?.(id);
    } else if (event.key === "Escape") {
      onSelect?.(null);
    }
  };
  return (
    <svg className={`pitch${interactive ? " is-interactive" : ""}`} viewBox="0 0 106 70" role={interactive ? "group" : "img"} aria-label={label}
      onClick={interactive ? () => onSelect?.(null) : undefined}>
      <Markings />
      {trail && <Trail events={trail} homeId={homeId} />}
      {path && events.length > 1 && (
        <polyline className="pitch-path" points={events.map((event) => `${px(event.x)},${py(event.y)}`).join(" ")} />
      )}
      {active?.type === "pass" && (
        <g className={`pitch-pass ${active.teamId === homeId ? "is-home" : "is-away"}${active.completed ? "" : " is-failed"}`}>
          <line x1={px(active.x)} y1={py(active.y)} x2={px(active.endX)} y2={py(active.endY)} />
          <circle cx={px(active.endX)} cy={py(active.endY)} r="1" />
        </g>
      )}
      <AnimatePresence initial={false}>
        {events.map((event, i) => {
          const team = event.teamId === homeId ? "is-home" : "is-away";
          const isLatest = i === last;
          const isActive = event.id === activeId;
          const age = last <= 0 ? 1 : i / last;
          const radius = isLatest ? 2.3 : fade ? 0.85 + 0.65 * age : 1.4;
          const vars = fade && !isLatest ? ({ "--dot-opacity": (0.25 + 0.5 * age).toFixed(2) } as CSSProperties) : undefined;
          return (
            <motion.g key={event.id} className={`pitch-event ${team}${isActive ? " is-active" : ""}`}
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, transition: { duration: 0.2 } }}
              {...(interactive ? {
                tabIndex: 0,
                role: "button",
                "aria-label": describe?.(event) ?? event.id,
                "aria-pressed": isActive,
                onPointerEnter: () => onHover?.(event.id),
                onPointerLeave: () => onHover?.(null),
                onFocus: () => onHover?.(event.id),
                onBlur: () => onHover?.(null),
                onClick: (e: MouseEvent) => { e.stopPropagation(); onSelect?.(event.id); },
                onKeyDown: (e: KeyboardEvent<SVGGElement>) => onDotKey(e, event.id),
              } : {})}>
              {isLatest && <circle className={`pitch-ring ${team}`} cx={px(event.x)} cy={py(event.y)} r="4.2" />}
              {isActive && <circle className={`pitch-focus ${team}`} cx={px(event.x)} cy={py(event.y)} r={radius + 2.2} />}
              <motion.circle className={`pitch-dot ${team}${isLatest ? " is-latest" : ""}`} style={vars} cx={px(event.x)} cy={py(event.y)}
                initial={{ r: 0 }} animate={{ r: isActive ? radius + 0.8 : radius }} transition={{ type: "spring", stiffness: 520, damping: 28 }} />
              {interactive && <circle className="pitch-hit" cx={px(event.x)} cy={py(event.y)} r="3.4" />}
            </motion.g>
          );
        })}
      </AnimatePresence>
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
