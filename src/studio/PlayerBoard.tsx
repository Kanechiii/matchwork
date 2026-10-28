import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent as ReactKeyboardEvent } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, ChevronLeft, ChevronRight, Search, X } from "lucide-react";
import type { PlayerStats } from "../engine/calculatePlayerStats";
import type { MatchEvent, Position, SyntheticMatch, Team } from "../types/match";
import { PlayerAvatar } from "../components/PlayerAvatar";
import { TeamCrest } from "../components/TeamCrest";
import { EventIcon } from "../components/EventIcon";
import { describeEvent, formatClock, POSITION_NAMES } from "./format";
import { EASE_IN, EASE_OUT, SPRING_BAR } from "../motion";

export const PREVIEW_DELAY_MS = 800;

type SortKey = "goals" | "shots" | "shotsOnTarget" | "passesCompleted" | "passCompletionPct" | "tacklesWon" | "pressures" | "passesReceived" | "number" | "name";
const SORTS: { key: SortKey; label: string; short: string; unit?: string }[] = [
  { key: "goals", label: "Goals", short: "goals" },
  { key: "shots", label: "Shots", short: "shots" },
  { key: "shotsOnTarget", label: "Shots on target", short: "on target" },
  { key: "passesCompleted", label: "Completed passes", short: "passes" },
  { key: "passCompletionPct", label: "Pass accuracy", short: "pass acc.", unit: "%" },
  { key: "tacklesWon", label: "Tackles won", short: "tackles" },
  { key: "pressures", label: "Pressures", short: "pressures" },
  { key: "passesReceived", label: "Passes received", short: "received" },
  { key: "number", label: "Shirt number", short: "shirt" },
  { key: "name", label: "Name (A–Z)", short: "" },
];
const POSITIONS: (Position | "all")[] = ["all", "GK", "DEF", "MID", "FWD"];

// Default order mirrors the original board: goals, then shots, then name.
function compare(key: SortKey) {
  return (a: PlayerStats, b: PlayerStats) => {
    if (key === "name") return a.name.localeCompare(b.name);
    if (key === "number") return a.number - b.number || a.name.localeCompare(b.name);
    return (b[key] as number) - (a[key] as number) || b.goals - a.goals || b.shots - a.shots || a.name.localeCompare(b.name);
  };
}

interface PlayerBoardProps {
  players: PlayerStats[];
  /** Teams in group order. */
  teams: Team[];
  view: "replay" | "season";
  teamFilter: string;
  onTeamFilterChange: (id: string) => void;
  selectedId: string | null;
  onSelect: (id: string | null) => void;
  isAnalyst: boolean;
  match: SyntheticMatch;
  elapsedSeconds: number;
  onSeek: (seconds: number) => void;
}

export function PlayerBoard({ players, teams, view, teamFilter, onTeamFilterChange, selectedId, onSelect, isAnalyst, match, elapsedSeconds, onSeek }: PlayerBoardProps) {
  const [position, setPosition] = useState<Position | "all">("all");
  const [sortKey, setSortKey] = useState<SortKey>("goals");
  const [query, setQuery] = useState("");
  const [preview, setPreview] = useState<{ id: string; rect: DOMRect } | null>(null);
  const timer = useRef<number | undefined>(undefined);

  const teamById = new Map(teams.map((team) => [team.id, team]));
  const activeTeam = teamById.has(teamFilter) ? teamFilter : "all";
  const sort = SORTS.find((s) => s.key === sortKey) ?? SORTS[0];
  const needle = query.trim().toLowerCase();
  const filtered = players
    .filter((p) => activeTeam === "all" || p.teamId === activeTeam)
    .filter((p) => position === "all" || p.position === position)
    .filter((p) => !needle || p.name.toLowerCase().includes(needle) || String(p.number) === needle)
    .sort(compare(sortKey));
  const groups = teams
    .map((team) => ({ team, players: filtered.filter((p) => p.teamId === team.id) }))
    .filter((group) => group.players.length > 0);
  const ordered = groups.flatMap((group) => group.players);
  const focused = selectedId ? players.find((p) => p.playerId === selectedId) ?? null : null;
  const previewPlayer = preview && !focused ? players.find((p) => p.playerId === preview.id) ?? null : null;
  const sideOf = (teamId: string) => (teamId === match.metadata.homeTeam.id ? "Home" : teamId === match.metadata.awayTeam.id ? "Away" : null);

  const disarm = () => { window.clearTimeout(timer.current); setPreview(null); };
  const arm = (target: HTMLElement, id: string) => {
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => setPreview({ id, rect: target.getBoundingClientRect() }), PREVIEW_DELAY_MS);
  };
  useEffect(() => () => window.clearTimeout(timer.current), []);
  useEffect(() => {
    if (!preview) return;
    const hide = () => setPreview(null);
    window.addEventListener("scroll", hide, true);
    window.addEventListener("resize", hide);
    return () => { window.removeEventListener("scroll", hide, true); window.removeEventListener("resize", hide); };
  }, [preview]);

  const resetFilters = () => { onTeamFilterChange("all"); setPosition("all"); setQuery(""); };
  const metricValue = (p: PlayerStats) => (sortKey === "name" ? p.goals : (p[sortKey] as number));
  const metricLabel = sortKey === "name" ? "goals" : sort.short;
  const metricUnit = sortKey === "name" ? "" : sort.unit ?? "";

  return (
    <>
      <div className="board-toolbar">
        <div className="board-filter" role="group" aria-label="Filter players by team">
          <span className="board-filter-label">Team</span>
          <button type="button" className="club-chip" aria-pressed={activeTeam === "all"} onClick={() => onTeamFilterChange("all")}>{teams.length > 2 ? "All clubs" : "Both teams"}</button>
          {teams.map((team) => (
            <button type="button" key={team.id} className="club-chip" aria-pressed={activeTeam === team.id} onClick={() => onTeamFilterChange(team.id)} title={team.name}>
              <TeamCrest team={team} size="xs" /><span>{teams.length > 2 ? team.abbreviation : team.name}</span>
            </button>
          ))}
        </div>
        <div className="board-filter" role="group" aria-label="Filter players by position">
          <span className="board-filter-label">Position</span>
          {POSITIONS.map((pos) => (
            <button type="button" key={pos} className="club-chip" aria-pressed={position === pos} onClick={() => setPosition(pos)} title={pos === "all" ? "All positions" : POSITION_NAMES[pos]}>
              {pos === "all" ? "All" : pos}
            </button>
          ))}
        </div>
        <div className="board-tools">
          <label className="board-search">
            <Search aria-hidden="true" />
            <input type="search" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Find a player or shirt number" aria-label="Find a player" />
          </label>
          <label className="board-sort">
            <span>Sort by</span>
            <span className="select-wrap">
              <select value={sortKey} onChange={(event) => setSortKey(event.target.value as SortKey)}>
                {SORTS.map((s) => <option key={s.key} value={s.key}>{s.label}</option>)}
              </select>
              <ChevronDown aria-hidden="true" />
            </span>
          </label>
        </div>
      </div>

      <p className="board-count tabular" aria-live="polite">{ordered.length} of {players.length} players · grouped by team · sorted by {sort.label.toLowerCase()}</p>

      {groups.length === 0 ? (
        <div className="board-empty">
          <p>No players match these filters.</p>
          <button type="button" className="btn btn-secondary btn-sm" onClick={resetFilters}>Reset filters</button>
        </div>
      ) : (
        <div className="board-scroll">
          {groups.map(({ team, players: list }) => {
            const side = view === "replay" ? sideOf(team.id) : null;
            const goals = list.reduce((n, p) => n + p.goals, 0);
            return (
              <section className="board-group" key={team.id} aria-label={`${team.name} players`} style={{ "--team": team.color } as CSSProperties}>
                <header className="board-group-head">
                  <TeamCrest team={team} size="sm" />
                  <strong>{team.name}</strong>
                  {side && <span className="board-side">{side}</span>}
                  <span className="board-group-meta tabular">{list.length} players · {goals} {goals === 1 ? "goal" : "goals"}</span>
                </header>
                <ul className="board-grid">
                  {list.map((p) => (
                    <motion.li key={p.playerId} layout="position" transition={{ duration: 0.35, ease: EASE_OUT }}>
                      <button type="button" className={`player-card${focused?.playerId === p.playerId ? " is-selected" : ""}`} aria-haspopup="dialog"
                        aria-label={`${p.name}, number ${p.number}, ${POSITION_NAMES[p.position as Position] ?? p.position}, ${team.name}. ${metricValue(p)}${metricUnit} ${metricLabel}. Open player profile`}
                        onClick={() => { disarm(); onSelect(p.playerId); }}
                        onPointerEnter={(event) => { if (event.pointerType !== "touch") arm(event.currentTarget, p.playerId); }}
                        onPointerLeave={disarm}
                        onFocus={(event) => { if (event.currentTarget.matches(":focus-visible")) arm(event.currentTarget, p.playerId); }}
                        onBlur={disarm}>
                        <PlayerAvatar playerId={p.playerId} kitColor={team.color} position={p.position} number={p.number} size="md" />
                        <span className="player-card-body">
                          <strong>{p.name}</strong>
                          <small>#{p.number} · {p.position}{view === "season" ? ` · ${p.appearances} apps` : ""}</small>
                          <span className="player-card-mini tabular">{p.shots} sh · {p.passCompletionPct}% pass · {p.tacklesWon} tkl</span>
                        </span>
                        <span className="player-card-metric"><b className="tabular">{metricValue(p)}{metricUnit}</b><small>{metricLabel}</small></span>
                      </button>
                    </motion.li>
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}

      {createPortal(
        <AnimatePresence>
          {preview && previewPlayer && (() => {
            const team = teamById.get(previewPlayer.teamId) ?? teams[0];
            const above = preview.rect.top > 280;
            const left = Math.min(window.innerWidth - 156, Math.max(156, preview.rect.left + preview.rect.width / 2));
            const top = above ? preview.rect.top - 10 : preview.rect.bottom + 10;
            return (
              <motion.div key={previewPlayer.playerId} className={`player-preview${above ? " is-above" : ""}`} role="tooltip" style={{ left, top, "--team": team.color } as CSSProperties}
                initial={{ opacity: 0, y: above ? 6 : -6, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } }} exit={{ opacity: 0, transition: { duration: 0.12, ease: EASE_IN } }}>
                <div className="player-preview-head">
                  <PlayerAvatar playerId={previewPlayer.playerId} kitColor={team.color} position={previewPlayer.position} number={previewPlayer.number} size="sm" />
                  <div>
                    <strong>{previewPlayer.name}</strong>
                    <small>#{previewPlayer.number} · {POSITION_NAMES[previewPlayer.position as Position] ?? previewPlayer.position}</small>
                  </div>
                </div>
                <span className="player-preview-team"><TeamCrest team={team} size="xs" />{team.name}{view === "season" ? ` · ${previewPlayer.appearances} apps` : ` · ${formatClock(elapsedSeconds)}`}</span>
                <dl className="player-preview-stats tabular">
                  <div><dt>Goals</dt><dd>{previewPlayer.goals}</dd></div>
                  <div><dt>Shots</dt><dd>{previewPlayer.shots}</dd></div>
                  <div><dt>Pass acc.</dt><dd>{previewPlayer.passCompletionPct}%</dd></div>
                  <div><dt>Tackles won</dt><dd>{previewPlayer.tacklesWon}</dd></div>
                </dl>
                <small className="player-preview-hint">Click for the full profile</small>
              </motion.div>
            );
          })()}
        </AnimatePresence>,
        document.body,
      )}

      {createPortal(
        <AnimatePresence>
          {focused && (
            <PlayerOverlay key="player-overlay" player={focused} team={teamById.get(focused.teamId) ?? teams[0]} side={view === "replay" ? sideOf(focused.teamId) : null}
              view={view} isAnalyst={isAnalyst} elapsedSeconds={elapsedSeconds}
              actions={view === "replay" ? playerActions(match, focused.playerId, elapsedSeconds) : []}
              onSeek={onSeek} onClose={() => onSelect(null)}
              neighbours={neighbours(ordered, focused.playerId)} onNavigate={onSelect} />
          )}
        </AnimatePresence>,
        document.body,
      )}
    </>
  );
}

function neighbours(list: PlayerStats[], id: string): { prev: PlayerStats | null; next: PlayerStats | null } {
  const index = list.findIndex((p) => p.playerId === id);
  if (index < 0) return { prev: null, next: null };
  return { prev: list[index - 1] ?? null, next: list[index + 1] ?? null };
}

interface Action { id: string; time: number; text: string; type: MatchEvent["type"] }

/** The player's latest observed involvements: own actions plus completed passes they received. */
function playerActions(match: SyntheticMatch, playerId: string, until: number): Action[] {
  const names = new Map([match.metadata.homeTeam, match.metadata.awayTeam].flatMap((t) => t.players.map((p) => [p.id, p.name] as const)));
  const actions: Action[] = [];
  for (const event of match.events) {
    if (event.elapsedSeconds > until) break;
    if (event.playerId === playerId) actions.push({ id: event.id, time: event.elapsedSeconds, text: describeEvent(event), type: event.type });
    else if (event.type === "pass" && event.completed && event.receiverId === playerId) {
      actions.push({ id: event.id, time: event.elapsedSeconds, text: `Received pass from ${names.get(event.playerId) ?? event.playerId}`, type: "pass" });
    }
  }
  return actions.slice(-6).reverse();
}

interface PlayerOverlayProps {
  player: PlayerStats;
  team: Team;
  side: string | null;
  view: "replay" | "season";
  isAnalyst: boolean;
  elapsedSeconds: number;
  actions: Action[];
  onSeek: (seconds: number) => void;
  onClose: () => void;
  neighbours: { prev: PlayerStats | null; next: PlayerStats | null };
  onNavigate: (id: string) => void;
}

function PlayerOverlay({ player, team, side, view, isAnalyst, elapsedSeconds, actions, onSeek, onClose, neighbours: near, onNavigate }: PlayerOverlayProps) {
  const dialog = useRef<HTMLDivElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    closeButton.current?.focus({ preventScroll: true });
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
  }, []);

  const onKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Escape") { event.preventDefault(); onClose(); return; }
    const target = event.target as HTMLElement;
    if (event.key === "ArrowLeft" && near.prev && !target.closest("details")) { event.preventDefault(); onNavigate(near.prev.playerId); }
    if (event.key === "ArrowRight" && near.next && !target.closest("details")) { event.preventDefault(); onNavigate(near.next.playerId); }
    if (event.key === "Tab" && dialog.current) {
      const focusable = Array.from(dialog.current.querySelectorAll<HTMLElement>("button:not([disabled]), summary, [tabindex='0']"));
      if (focusable.length === 0) return;
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    }
  };

  const position = POSITION_NAMES[player.position as Position] ?? player.position;
  const numbers = [
    { label: "Goals", value: player.goals },
    { label: "Shots", value: player.shots },
    { label: "On target", value: player.shotsOnTarget },
    { label: "Passes", value: `${player.passesCompleted}/${player.passesAttempted}` },
    { label: "Pass accuracy", value: `${player.passCompletionPct}%` },
    { label: "Tackles won", value: player.tacklesWon },
    { label: "Pressures", value: player.pressures },
    { label: "Passes received", value: player.passesReceived },
  ];
  const shotScale = Math.max(1, player.shots);
  const tackleScale = Math.max(1, player.tacklesAttempted);
  const ring = 2 * Math.PI * 26;
  const titleId = `player-overlay-${player.playerId}`;

  return (
    <motion.div className="overlay-backdrop" onClick={onClose} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.2 } }} exit={{ opacity: 0, transition: { duration: 0.18 } }}>
      <motion.div ref={dialog} className="player-overlay" role="dialog" aria-modal="true" aria-labelledby={titleId} style={{ "--team": team.color } as CSSProperties}
        onClick={(event) => event.stopPropagation()} onKeyDown={onKeyDown}
        initial={{ opacity: 0, y: 24, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.35, ease: EASE_OUT } }} exit={{ opacity: 0, y: 12, scale: 0.98, transition: { duration: 0.18, ease: EASE_IN } }}>
        <div className="overlay-bar">
          <div className="overlay-nav">
            <button type="button" className="icon-btn" disabled={!near.prev} onClick={() => near.prev && onNavigate(near.prev.playerId)} aria-label={near.prev ? `Previous player: ${near.prev.name}` : "No previous player"}><ChevronLeft aria-hidden="true" /></button>
            <button type="button" className="icon-btn" disabled={!near.next} onClick={() => near.next && onNavigate(near.next.playerId)} aria-label={near.next ? `Next player: ${near.next.name}` : "No next player"}><ChevronRight aria-hidden="true" /></button>
          </div>
          <button ref={closeButton} type="button" className="icon-btn" onClick={onClose} aria-label="Close player profile"><X aria-hidden="true" /></button>
        </div>

        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={player.playerId} className="overlay-body" initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0, transition: { duration: 0.25, ease: EASE_OUT } }} exit={{ opacity: 0, x: -10, transition: { duration: 0.12 } }}>
            <header className="overlay-hero">
              <PlayerAvatar playerId={player.playerId} kitColor={team.color} position={player.position} number={player.number} size="xl" />
              <div className="overlay-id">
                <h3 id={titleId}>{player.name}</h3>
                <p>#{player.number} · {position}</p>
                <span className="overlay-team"><TeamCrest team={team} size="sm" />{team.name}{side ? ` · ${side}` : ""}</span>
              </div>
              <span className="overlay-period tabular">{view === "replay" ? `Replay so far · ${formatClock(elapsedSeconds)}` : `All fixtures · ${player.appearances} ${player.appearances === 1 ? "appearance" : "appearances"}`}</span>
            </header>

            <div className="overlay-numbers">
              {numbers.map((n) => <div key={n.label}><strong className="tabular">{n.value}</strong><span>{n.label}</span></div>)}
            </div>

            <div className="overlay-visuals">
              <section className="overlay-panel" aria-label="Shooting">
                <span className="label">Shooting</span>
                {[{ label: "Shots", value: player.shots }, { label: "On target", value: player.shotsOnTarget }, { label: "Goals", value: player.goals }].map((row) => (
                  <div className="funnel-row" key={row.label}>
                    <span>{row.label}</span>
                    <span className="funnel-track"><motion.span initial={false} animate={{ width: `${(100 * row.value) / shotScale}%` }} transition={SPRING_BAR} /></span>
                    <strong className="tabular">{row.value}</strong>
                  </div>
                ))}
              </section>
              <section className="overlay-panel overlay-ring" aria-label="Passing">
                <span className="label">Passing</span>
                <div className="ring-wrap">
                  <svg viewBox="0 0 64 64" aria-hidden="true">
                    <circle className="ring-track" cx="32" cy="32" r="26" />
                    <motion.circle className="ring-value" cx="32" cy="32" r="26" strokeDasharray={ring} initial={false}
                      animate={{ strokeDashoffset: ring * (1 - player.passCompletionPct / 100) }} transition={SPRING_BAR} />
                  </svg>
                  <strong className="tabular">{Math.round(player.passCompletionPct)}%</strong>
                </div>
                <small className="tabular">{player.passesCompleted} of {player.passesAttempted} completed · {player.passesReceived} received</small>
              </section>
              <section className="overlay-panel" aria-label="Defending">
                <span className="label">Defending</span>
                <div className="funnel-row">
                  <span>Tackles</span>
                  <span className="funnel-track"><motion.span initial={false} animate={{ width: `${(100 * player.tacklesWon) / tackleScale}%` }} transition={SPRING_BAR} /></span>
                  <strong className="tabular">{player.tacklesWon}/{player.tacklesAttempted}</strong>
                </div>
                <div className="overlay-stat-big"><strong className="tabular">{player.pressures}</strong><span>defensive pressures</span></div>
              </section>
            </div>

            {view === "replay" && (
              <section className="overlay-actions" aria-label="Recent actions">
                <span className="label">Recent involvement</span>
                {actions.length === 0 ? <p className="muted">No observed actions yet. Keep the replay running.</p> : (
                  <ol>
                    {actions.map((action) => (
                      <li key={`${action.id}-${action.text}`}>
                        <button type="button" className="overlay-action" onClick={() => onSeek(action.time)} title="Jump the replay to this moment">
                          <span className="event-icon"><EventIcon type={action.type} /></span>
                          <span>{action.text}</span>
                          <time className="tabular">{formatClock(action.time)}</time>
                        </button>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}

            {isAnalyst && (
              <details className="evidence overlay-evidence">
                <summary><span>Observed event evidence ({player.evidenceIds.length})</span><ChevronDown aria-hidden="true" /></summary>
                <p>{player.evidenceIds.slice(-18).join(" · ") || "No observed actions yet"}</p>
              </details>
            )}
            <p className="overlay-foot">Fictional player · every figure comes from recorded synthetic events.</p>
          </motion.div>
        </AnimatePresence>
      </motion.div>
    </motion.div>
  );
}
