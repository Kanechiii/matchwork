import type { MatchEvent, TeamId } from "../types/match";
import "./Pitch.css";

interface PitchProps {
  events: MatchEvent[];
  homeId: TeamId;
  label: string;
}

// Event coordinates are 0-100 on both axes; the drawing keeps a real pitch ratio.
const X0 = 3, Y0 = 3, W = 100, H = 64;
const px = (x: number) => X0 + (x / 100) * W;
const py = (y: number) => Y0 + (y / 100) * H;

/** Pitch with recent event positions. The last event in the list is emphasised. */
export function Pitch({ events, homeId, label }: PitchProps) {
  const last = events.length - 1;
  return (
    <svg className="pitch" viewBox="0 0 106 70" role="img" aria-label={label}>
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
      {events.map((event, i) => {
        const team = event.teamId === homeId ? "is-home" : "is-away";
        const latest = i === last;
        return (
          <g key={event.id}>
            {latest && <circle className={`pitch-ring ${team}`} cx={px(event.x)} cy={py(event.y)} r="4.2" />}
            <circle className={`pitch-dot ${team}${latest ? " is-latest" : ""}`} cx={px(event.x)} cy={py(event.y)} r={latest ? 2.3 : 1.4} />
          </g>
        );
      })}
    </svg>
  );
}
