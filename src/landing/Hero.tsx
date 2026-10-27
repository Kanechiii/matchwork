import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { animate, motion, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { ArrowRight, Info } from "lucide-react";
import type { SyntheticMatch } from "../types/match";
import { buildMatchRecap } from "../ai/explanations";
import { Pitch } from "../components/Pitch";
import { EASE_IN_OUT, EASE_OUT } from "../motion";
import { clock, frameAt } from "./sample";

const HEADLINE = [
  { text: "Football moves fast.", accent: false },
  { text: "Understanding it shouldn't.", accent: true },
];

function AnimatedHeadline() {
  let index = 0;
  return (
    <h1 className="lp-hero-title" aria-label={HEADLINE.map((l) => l.text).join(" ")}>
      {HEADLINE.map((line) => (
        <span key={line.text} className={`lp-hero-line${line.accent ? " is-accent" : ""}`} aria-hidden="true">
          {line.text.split(" ").map((word) => {
            const delay = 0.15 + index++ * 0.06;
            return (
              <span key={word} className="lp-word-mask">
                <motion.span className="lp-word" initial={{ y: "105%" }} animate={{ y: "0%" }} transition={{ duration: 0.9, ease: EASE_OUT, delay }}>
                  {word}
                </motion.span>
              </span>
            );
          })}
        </span>
      ))}
    </h1>
  );
}

/** A live, scrubbable replay of the real fictional match. Plays a short kick-off intro once. */
function HeroReplay({ match, introTo }: { match: SyntheticMatch; introTo: number }) {
  const duration = match.metadata.durationSeconds;
  const reduce = useReducedMotion();
  const [time, setTime] = useState(reduce ? introTo : 0);
  const [touched, setTouched] = useState(false);
  const intro = useRef<AnimationPlaybackControls | null>(null);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, introTo, { duration: 3.2, ease: EASE_IN_OUT, delay: 0.9, onUpdate: (v) => setTime(Math.round(v)) });
    intro.current = controls;
    return () => controls.stop();
  }, [introTo, reduce]);

  const seek = (seconds: number) => {
    intro.current?.stop();
    setTouched(true);
    setTime(Math.max(0, Math.min(duration, Math.round(seconds))));
  };

  const frame = useMemo(() => frameAt(match, time), [match, time]);
  const trail = useMemo(() => match.events.slice(0, frame.stats.processedEvents), [match, frame.stats.processedEvents]);
  const goals = useMemo(() => match.events.filter((e) => e.type === "shot" && e.outcome === "goal"), [match]);
  const { home, away } = frame.stats;
  const homeTeam = match.metadata.homeTeam;
  const awayTeam = match.metadata.awayTeam;
  const pct = (100 * time) / duration;

  return (
    <motion.figure className="lp-replay" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE_OUT, delay: 0.35 }} aria-label="Interactive replay of the fictional match">
      <div className="lp-replay-head">
        <span>{match.metadata.title}</span>
        <span className="tabular">{clock(time)}</span>
      </div>
      <div className="lp-replay-score">
        <span className="lp-team"><i className="lp-chip is-home">{homeTeam.abbreviation}</i><span>{homeTeam.name}</span></span>
        <strong className="tabular" aria-live="polite" aria-label={`${home.goals} to ${away.goals}`}>
          <motion.span key={`h${home.goals}`} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }}>{home.goals}</motion.span>
          <span className="lp-score-sep">–</span>
          <motion.span key={`a${away.goals}`} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ duration: 0.4, ease: EASE_OUT }}>{away.goals}</motion.span>
        </strong>
        <span className="lp-team lp-team-away"><span>{awayTeam.name}</span><i className="lp-chip is-away">{awayTeam.abbreviation}</i></span>
      </div>
      <div className="lp-replay-pitch">
        <Pitch events={frame.recentEvents} trail={trail} homeId={homeTeam.id} ping label={`Event positions up to ${clock(time)}`} />
      </div>
      <div className="lp-replay-scrub">
        <div className="lp-goal-marks">
          {goals.map((goal) => (
            <button key={goal.id} type="button" className={`lp-goal-mark ${goal.teamId === homeTeam.id ? "is-home" : "is-away"}${goal.elapsedSeconds <= time ? " is-past" : ""}`}
              style={{ left: `${(100 * goal.elapsedSeconds) / duration}%` }} onClick={() => seek(goal.elapsedSeconds)}
              aria-label={`Jump to the goal at ${clock(goal.elapsedSeconds)}`} title={`Goal ${clock(goal.elapsedSeconds)}`} />
          ))}
        </div>
        <input type="range" className="timeline-range" min={0} max={duration} step={15} value={time}
          style={{ "--progress": `${pct}%` } as CSSProperties}
          aria-label="Scrub the fictional match" aria-valuetext={clock(time)}
          onPointerDown={() => intro.current?.stop()} onChange={(e) => seek(Number(e.target.value))} />
        <div className="lp-scrub-hint">
          <span>{touched ? "Every number below is computed from events up to this minute." : "Drag the timeline or tap a goal marker."}</span>
          <span className="tabular">{clock(duration)}</span>
        </div>
      </div>
      <dl className="lp-replay-stats tabular">
        <div><dt>Shots</dt><dd>{home.shots}<span>–</span>{away.shots}</dd></div>
        <div><dt>Possession</dt><dd>{Math.round(home.possessionPct)}%<span>–</span>{Math.round(away.possessionPct)}%</dd></div>
        <div><dt>Pass accuracy</dt><dd>{Math.round(home.passCompletionPct)}%<span>–</span>{Math.round(away.passCompletionPct)}%</dd></div>
      </dl>
      <figcaption className="lp-replay-recap">{buildMatchRecap(match, time)}</figcaption>
    </motion.figure>
  );
}

export function Hero({ match, introTo }: { match: SyntheticMatch; introTo: number }) {
  return (
    <section className="lp-hero" id="top">
      <div className="lp-hero-copy">
        <motion.p className="lp-overline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.6, delay: 0.05 }}>
          Inside the Game · Microsoft × Premier League Developer Hackathon 2026
        </motion.p>
        <AnimatedHeadline />
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8, ease: EASE_OUT, delay: 0.75 }}>
          <p className="lp-lede">Matchwork replays a fictional 90-minute match event by event, then explains each spell of play for fans and analysts, with the exact events behind every explanation.</p>
          <div className="lp-actions">
            <a href="#/studio" className="btn btn-primary btn-lg">Open the match studio <ArrowRight aria-hidden="true" /></a>
            <a href="#story" className="btn btn-secondary btn-lg">Follow the story</a>
          </div>
          <p className="lp-note"><Info aria-hidden="true" /> Fictional teams and synthetic events only. No live Premier League data.</p>
        </motion.div>
      </div>
      <HeroReplay match={match} introTo={introTo} />
    </section>
  );
}
