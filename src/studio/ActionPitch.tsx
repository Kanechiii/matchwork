import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { MousePointerClick, UserRound, X } from "lucide-react";
import type { MatchEvent, SyntheticMatch } from "../types/match";
import { Pitch } from "../components/Pitch";
import { PITCH_H, PITCH_W, px, py } from "../components/pitchGeometry";
import { EventIcon } from "../components/EventIcon";
import { TeamCrest } from "../components/TeamCrest";
import { describeEvent, describeEventDetail, describeZone, formatClock, POSITION_NAMES, type RosterEntry } from "./format";
import { EASE_OUT } from "../motion";

interface ActionPitchProps {
  events: MatchEvent[];
  match: SyntheticMatch;
  roster: Map<string, RosterEntry>;
  label: string;
  isAnalyst: boolean;
  path?: boolean;
  fade?: boolean;
  onOpenPlayer?: (playerId: string) => void;
}

/** Pitch whose event dots reveal player, team and event details on hover, focus or tap. */
export function ActionPitch({ events, match, roster, label, isAnalyst, path, fade, onOpenPlayer }: ActionPitchProps) {
  const [hoverId, setHoverId] = useState<string | null>(null);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const { homeTeam, awayTeam } = match.metadata;
  const teams = [homeTeam, awayTeam];
  const shownId = hoverId ?? pinnedId;
  const shown = shownId ? events.find((event) => event.id === shownId) ?? null : null;
  const pinned = shown !== null && hoverId === null && shown.id === pinnedId;
  const latestId = events.at(-1)?.id;

  const describe = (event: MatchEvent) => {
    const who = roster.get(event.playerId);
    return `${describeEvent(event)} at ${formatClock(event.elapsedSeconds)}${who ? `, ${who.player.name}, ${who.team.name}` : ""}`;
  };

  return (
    <div className="action-pitch">
      <Pitch events={events} homeId={homeTeam.id} ping path={path} fade={fade} label={label} describe={describe}
        activeId={shown?.id ?? null} onHover={setHoverId}
        onSelect={(id) => setPinnedId((current) => (id === null || current === id ? null : id))} />
      <div className="action-pitch-dir" aria-hidden="true">
        <span><TeamCrest team={homeTeam} size="xs" />{homeTeam.abbreviation} attack →</span>
        <span>← {awayTeam.abbreviation} attack<TeamCrest team={awayTeam} size="xs" /></span>
      </div>
      <AnimatePresence>
        {shown && (() => {
          const who = roster.get(shown.playerId);
          const team = shown.teamId === homeTeam.id ? homeTeam : awayTeam;
          const side = shown.teamId === homeTeam.id ? "home" : "away";
          const left = (100 * px(shown.x)) / PITCH_W;
          const top = (100 * py(shown.y)) / PITCH_H;
          const placement = `${top < 46 ? "is-below" : "is-above"} ${left < 24 ? "is-start" : left > 76 ? "is-end" : "is-center"}`;
          return (
            <div key={shown.id} className="pitch-tip-anchor" style={{ left: `${left}%`, top: `${top}%` }}>
              <motion.div className={`pitch-tip ${placement}${pinned ? " is-pinned" : ""}`} role={pinned ? "group" : "tooltip"} aria-label={pinned ? "Pinned event details" : undefined}
                initial={{ opacity: 0, y: top < 46 ? -4 : 4 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.18, ease: EASE_OUT } }} exit={{ opacity: 0, transition: { duration: 0.12 } }}>
                <div className="pitch-tip-head">
                  <span className={`event-icon is-${side}`}><EventIcon type={shown.type} /></span>
                  <div>
                    <strong>{describeEvent(shown)}</strong>
                    <small className="tabular">{formatClock(shown.elapsedSeconds)}{shown.id === latestId ? " · Latest" : ""}</small>
                  </div>
                  {pinned && (
                    <button type="button" className="icon-btn pitch-tip-close" aria-label="Close event details" onClick={() => setPinnedId(null)}><X aria-hidden="true" /></button>
                  )}
                </div>
                <dl className="pitch-tip-rows">
                  <div><dt>Player</dt><dd>{who ? `#${who.player.shirtNumber} ${who.player.name} · ${POSITION_NAMES[who.player.position]}` : shown.playerId}</dd></div>
                  <div><dt>Team</dt><dd><TeamCrest team={team} size="xs" />{team.name} <span className="muted-inline">· {side === "home" ? "Home" : "Away"}</span></dd></div>
                  <div><dt>Detail</dt><dd>{describeEventDetail(shown, roster, teams)}</dd></div>
                  <div><dt>Zone</dt><dd>{describeZone(shown, homeTeam.id)}</dd></div>
                  {isAnalyst && <div><dt>Event</dt><dd><code>{shown.id}</code> <span className="tabular">x {Math.round(shown.x)} · y {Math.round(shown.y)}</span></dd></div>}
                </dl>
                {pinned ? (
                  onOpenPlayer && who && (
                    <button type="button" className="btn btn-secondary btn-sm pitch-tip-action" onClick={() => onOpenPlayer(shown.playerId)}>
                      <UserRound aria-hidden="true" /> View {who.player.name.split(" ")[0]}'s profile
                    </button>
                  )
                ) : (
                  <small className="pitch-tip-hint"><MousePointerClick aria-hidden="true" /> Click the dot to pin</small>
                )}
              </motion.div>
            </div>
          );
        })()}
      </AnimatePresence>
    </div>
  );
}
