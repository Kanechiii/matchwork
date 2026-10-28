import { useCallback, useEffect, useId, useRef, useState, type KeyboardEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Check, ChevronDown, ChevronLeft, ChevronRight, Sparkles } from "lucide-react";
import type { LeagueFixture } from "../data/league";
import type { Team } from "../types/match";
import { TeamCrest, type CrestSize } from "../components/TeamCrest";
import { EASE_IN, EASE_OUT } from "../motion";

function CrestPair({ home, away, size = "sm" }: { home: Team; away: Team; size?: CrestSize }) {
  return (
    <span className="crest-pair" aria-hidden="true">
      <TeamCrest team={home} size={size} />
      <TeamCrest team={away} size={size} />
    </span>
  );
}

interface FixturePickerProps {
  fixtures: LeagueFixture[];
  value: string;
  onChange: (id: string) => void;
  /** Fixture that supports secure Foundry narration. */
  featuredId: string;
}

/** Accessible listbox for choosing a fixture, grouped by matchday. */
export function FixturePicker({ fixtures, value, onChange, featuredId }: FixturePickerProps) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const selectedIndex = Math.max(0, fixtures.findIndex((fixture) => fixture.id === value));
  const selected = fixtures[selectedIndex];
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(selectedIndex);
  const root = useRef<HTMLDivElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);

  const rounds: { name: string; items: { fixture: LeagueFixture; index: number }[] }[] = [];
  fixtures.forEach((fixture, index) => {
    const group = rounds.find((round) => round.name === fixture.round);
    if (group) group.items.push({ fixture, index });
    else rounds.push({ name: fixture.round, items: [{ fixture, index }] });
  });

  const openList = () => { setActive(selectedIndex); setOpen(true); };
  const close = () => { setOpen(false); trigger.current?.focus(); };
  const choose = (index: number) => {
    const next = fixtures[index];
    close();
    if (next && next.id !== value) onChange(next.id);
  };

  useEffect(() => {
    if (!open) return;
    list.current?.focus({ preventScroll: true });
    const onDown = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onDown);
    return () => document.removeEventListener("pointerdown", onDown);
  }, [open]);

  // Keep the active option visible without scrolling the page.
  useEffect(() => {
    const box = list.current;
    const option = open ? document.getElementById(`${uid}-opt-${active}`) : null;
    if (!box || !option) return;
    const top = option.offsetTop;
    const bottom = top + option.offsetHeight;
    if (top < box.scrollTop + 34) box.scrollTop = Math.max(0, top - 34);
    else if (bottom > box.scrollTop + box.clientHeight - 6) box.scrollTop = bottom - box.clientHeight + 6;
  }, [active, open, uid]);

  const onTriggerKey = (event: KeyboardEvent<HTMLButtonElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      openList();
    }
  };
  const onListKey = (event: KeyboardEvent<HTMLUListElement>) => {
    const last = fixtures.length - 1;
    switch (event.key) {
      case "ArrowDown": event.preventDefault(); setActive((i) => Math.min(last, i + 1)); break;
      case "ArrowUp": event.preventDefault(); setActive((i) => Math.max(0, i - 1)); break;
      case "Home": event.preventDefault(); setActive(0); break;
      case "End": event.preventDefault(); setActive(last); break;
      case "Enter": case " ": event.preventDefault(); choose(active); break;
      case "Escape": event.preventDefault(); close(); break;
      case "Tab": setOpen(false); break;
    }
  };

  const meta = selected.match.metadata;
  return (
    <div className="fixture-picker" ref={root}>
      <span className="fixture-picker-label" id={`${uid}-label`}>Selected fixture</span>
      <button ref={trigger} type="button" className={`fixture-trigger${open ? " is-open" : ""}`} aria-haspopup="listbox" aria-expanded={open}
        aria-labelledby={`${uid}-label ${uid}-value`} onClick={() => (open ? setOpen(false) : openList())} onKeyDown={onTriggerKey}>
        <CrestPair home={meta.homeTeam} away={meta.awayTeam} size="md" />
        <span className="fixture-trigger-text" id={`${uid}-value`}>
          <small>{selected.round} · Fixture {selectedIndex + 1} of {fixtures.length}</small>
          <strong>{meta.homeTeam.name} <span>vs</span> {meta.awayTeam.name}</strong>
        </span>
        <ChevronDown className="fixture-trigger-chevron" aria-hidden="true" />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div className="fixture-menu" initial={{ opacity: 0, y: -6, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1, transition: { duration: 0.2, ease: EASE_OUT } }}
            exit={{ opacity: 0, y: -4, transition: { duration: 0.12, ease: EASE_IN } }}>
            <ul ref={list} className="fixture-list" role="listbox" tabIndex={-1} aria-labelledby={`${uid}-label`}
              aria-activedescendant={`${uid}-opt-${active}`} onKeyDown={onListKey}>
              {rounds.map((round) => {
                const roundId = `${uid}-${round.name.replace(/\W+/g, "-")}`;
                return (
                  <li key={round.name} role="presentation">
                    <div className="fixture-round" id={roundId}>{round.name}</div>
                    <ul role="group" aria-labelledby={roundId}>
                      {round.items.map(({ fixture, index }) => {
                        const m = fixture.match.metadata;
                        const isSelected = fixture.id === value;
                        return (
                          <li key={fixture.id} id={`${uid}-opt-${index}`} role="option" aria-selected={isSelected}
                            className={`fixture-option${index === active ? " is-active" : ""}${isSelected ? " is-selected" : ""}`}
                            onPointerMove={() => setActive(index)} onClick={() => choose(index)}>
                            <CrestPair home={m.homeTeam} away={m.awayTeam} />
                            <span className="fixture-option-text">
                              <strong>{m.homeTeam.name} <span>vs</span> {m.awayTeam.name}</strong>
                              <small>
                                {m.homeTeam.abbreviation} home · {m.awayTeam.abbreviation} away
                                {fixture.id === featuredId && <span className="fixture-tag"><Sparkles aria-hidden="true" /> Foundry narration</span>}
                              </small>
                            </span>
                            {isSelected && <Check className="fixture-check" aria-hidden="true" />}
                          </li>
                        );
                      })}
                    </ul>
                  </li>
                );
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface FixtureStripProps {
  fixtures: LeagueFixture[];
  teams: Team[];
  value: string;
  onChange: (id: string) => void;
}

/** Horizontally scrolling fixture rail with a club filter. The native scrollbar is hidden. */
export function FixtureStrip({ fixtures, teams, value, onChange }: FixtureStripProps) {
  const [club, setClub] = useState("all");
  const scroller = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: true });
  const shown = club === "all"
    ? fixtures
    : fixtures.filter((f) => f.match.metadata.homeTeam.id === club || f.match.metadata.awayTeam.id === club);

  const measure = useCallback(() => {
    const el = scroller.current;
    if (!el) return;
    setEdges({ start: el.scrollLeft <= 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  }, []);

  // Centre the selected fixture on mount, then keep the edge state in sync with size changes.
  useEffect(() => {
    const el = scroller.current;
    if (!el) return;
    const selected = el.querySelector<HTMLElement>('[aria-pressed="true"]');
    if (selected) el.scrollLeft = selected.offsetLeft - (el.clientWidth - selected.offsetWidth) / 2;
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(el);
    return () => observer.disconnect();
  }, [measure]);

  const pickClub = (id: string) => {
    setClub(id);
    requestAnimationFrame(() => { scroller.current?.scrollTo({ left: 0 }); measure(); });
  };
  const page = (direction: 1 | -1) => {
    const el = scroller.current;
    if (el) el.scrollBy({ left: direction * el.clientWidth * 0.8, behavior: "smooth" });
  };

  return (
    <div className="fixture-browser">
      <div className="club-filter" role="group" aria-label="Filter fixtures by club">
        <button type="button" className="club-chip" aria-pressed={club === "all"} onClick={() => pickClub("all")}>All clubs</button>
        {teams.map((team) => (
          <button type="button" key={team.id} className="club-chip" aria-pressed={club === team.id} onClick={() => pickClub(team.id)} title={team.name} aria-label={`${team.name} fixtures`}>
            <TeamCrest team={team} size="xs" /><span>{team.abbreviation}</span>
          </button>
        ))}
      </div>
      <div className={`fixture-rail${edges.start ? "" : " has-start"}${edges.end ? "" : " has-end"}`}>
        <button type="button" className="rail-btn is-prev" aria-label="Scroll fixtures left" disabled={edges.start} onClick={() => page(-1)}><ChevronLeft aria-hidden="true" /></button>
        <div className="fixture-scroller" ref={scroller} onScroll={measure} role="group" aria-label="Match fixtures">
          {shown.map((fixture) => {
            const m = fixture.match.metadata;
            const isSelected = fixture.id === value;
            return (
              <button type="button" key={fixture.id} className={`fixture-card${isSelected ? " is-selected" : ""}`} aria-pressed={isSelected}
                aria-label={`${fixture.round}: ${m.title}`} onClick={() => onChange(fixture.id)}>
                <span className="fixture-card-top">
                  <small>{fixture.round}</small>
                  {isSelected && <span className="fixture-viewing"><span className="status-dot" aria-hidden="true" />Viewing</span>}
                </span>
                <span className="fixture-card-teams">
                  <span className="fixture-card-team"><TeamCrest team={m.homeTeam} size="sm" /><strong>{m.homeTeam.abbreviation}</strong></span>
                  <span className="fixture-card-vs">vs</span>
                  <span className="fixture-card-team is-away"><strong>{m.awayTeam.abbreviation}</strong><TeamCrest team={m.awayTeam} size="sm" /></span>
                </span>
              </button>
            );
          })}
        </div>
        <button type="button" className="rail-btn is-next" aria-label="Scroll fixtures right" disabled={edges.end} onClick={() => page(1)}><ChevronRight aria-hidden="true" /></button>
      </div>
    </div>
  );
}
