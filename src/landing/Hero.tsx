import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { AnimatePresence, animate, motion, useReducedMotion, type AnimationPlaybackControls } from "motion/react";
import { ArrowRight, Info } from "lucide-react";
import type { SyntheticMatch } from "../types/match";
import { EASE_IN, EASE_IN_OUT, EASE_OUT, SPRING_BAR, STAGGER } from "../motion";
import { ActivityStrip } from "./ActivityStrip";
import { clock, frameAt, readEvent, readWindow, useMinuteBins } from "./sample";

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

/** Live insight card: a rules-based read of the moment that follows the clock. Plays a short kick-off intro once. */
function LiveInsightCard({ match, introTo }: { match: SyntheticMatch; introTo: number }) {
  const duration = match.metadata.durationSeconds;
  const homeId = match.metadata.homeTeam.id;
  const reduce = useReducedMotion();
  const [time, setTime] = useState(reduce ? introTo : 0);
  const [touched, setTouched] = useState(false);
  const intro = useRef<AnimationPlaybackControls | null>(null);
  const strip = useMinuteBins(match);

  useEffect(() => {
    if (reduce) return;
    const controls = animate(0, introTo, { duration: 3.4, ease: EASE_IN_OUT, delay: 0.9, onUpdate: (v) => setTime(Math.round(v)) });
    intro.current = controls;
    return () => controls.stop();
  }, [introTo, reduce]);

  const seek = (seconds: number) => {
    intro.current?.stop();
    setTouched(true);
    setTime(Math.max(0, Math.min(duration, Math.round(seconds))));
  };

  const { home, away } = useMemo(() => frameAt(match, time).stats, [match, time]);
  const read = useMemo(() => readWindow(match, time), [match, time]);
  const f = read.features;
  const third = read.homeThird + read.awayThird;
  const homeShare = third === 0 ? 50 : (100 * read.homeThird) / third;
  const headline = read.notable ? readEvent(match, read.notable) : "Kick-off";
  const pct = (100 * time) / duration;

  return (
    <motion.figure className="lp-live" initial={{ opacity: 0, y: 32 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, ease: EASE_OUT, delay: 0.35 }} aria-label="Live insight card following the replay clock">
      <div className="lp-live-head">
        <span>Live insight</span>
        <span className="tabular">{clock(time)} / {clock(duration)}</span>
      </div>

      <div className="lp-live-score">
        <span className="lp-side is-home">Home</span>
        <strong className="tabular" aria-live="polite" aria-label={`Home ${home.goals}, away ${away.goals}`}>
          <motion.span key={`h${home.goals}`} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>{home.goals}</motion.span>
          <span className="lp-score-sep">–</span>
          <motion.span key={`a${away.goals}`} initial={{ y: -10, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ type: "spring", stiffness: 420, damping: 24 }}>{away.goals}</motion.span>
        </strong>
        <span className="lp-side is-away">Away</span>
      </div>

      <div className="lp-live-read">
        <span className="lp-live-label">Latest key moment{read.notable ? ` · ${clock(read.notable.elapsedSeconds)}` : ""}</span>
        <div className="lp-live-headline">
          <AnimatePresence mode="popLayout" initial={false}>
            <motion.h3 key={headline + (read.notable?.id ?? "")}
              initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_OUT } }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.18, ease: EASE_IN } }}>
              {headline}
            </motion.h3>
          </AnimatePresence>
        </div>
        <p className="tabular">Last three minutes: {f.passesCompleted} of {f.passesAttempted} passes completed, {f.pressures} pressures, {f.turnovers} turnovers, {f.shots} {f.shots === 1 ? "shot" : "shots"}.</p>
      </div>

      <div className="lp-live-momentum">
        <div className="lp-live-momentum-head tabular">
          <span>Home <strong>{read.homeThird}</strong></span>
          <span className="lp-live-label">Final-third actions, last 3 min</span>
          <span><strong>{read.awayThird}</strong> Away</span>
        </div>
        <div className="lp-split">
          <motion.span className="is-home" initial={false} animate={{ width: `${homeShare}%` }} transition={SPRING_BAR} />
          <span className="is-away" />
        </div>
      </div>

      <div className="lp-live-cites">
        <span className="lp-live-label">Cites</span>
        <AnimatePresence mode="popLayout" initial={false}>
          {read.cites.map((id, i) => (
            <motion.code key={id} layout="position"
              initial={{ opacity: 0, scale: 0.85 }} animate={{ opacity: 1, scale: 1, transition: { duration: 0.3, ease: EASE_OUT, delay: i * STAGGER * 0.5 } }}
              exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.15, ease: EASE_IN } }}>
              {id}
            </motion.code>
          ))}
        </AnimatePresence>
        {read.cites.length === 0 && <span className="lp-live-label">No events yet</span>}
      </div>

      <div className="lp-live-scrub">
        <ActivityStrip bins={strip.bins} max={strip.max} goals={strip.goals} homeId={homeId} duration={duration} time={time}
          window={[f.startSeconds, f.endSeconds]} onSeek={seek} formatTime={clock}
          label={`Events per minute for home and away up to ${clock(time)}`} />
        <input type="range" className="timeline-range" min={0} max={duration} step={15} value={time}
          style={{ "--progress": `${pct}%` } as CSSProperties}
          aria-label="Scrub the demo fixture" aria-valuetext={clock(time)}
          onPointerDown={() => intro.current?.stop()} onChange={(e) => seek(Number(e.target.value))} />
        <div className="lp-scrub-hint">
          <span>{touched ? "Everything above is computed from events up to this minute." : "Drag the timeline or tap a goal marker."}</span>
          <span className="lp-strip-legend"><i className="is-home" /> Home <i className="is-away" /> Away</span>
        </div>
      </div>
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
          <p className="lp-lede">Matchwork is a football insight system. It reads every event of a match and explains each spell of play for whichever team you follow, at fan or analyst depth, with the exact events behind every explanation.</p>
          <div className="lp-actions">
            <a href="#/studio" className="btn btn-primary btn-lg">Open the match studio <ArrowRight aria-hidden="true" /></a>
            <a href="#story" className="btn btn-secondary btn-lg">Follow the story</a>
          </div>
          <p className="lp-note"><Info aria-hidden="true" /> The demo runs on one seeded fictional fixture. More teams are on the way.</p>
        </motion.div>
      </div>
      <LiveInsightCard match={match} introTo={introTo} />
    </section>
  );
}
