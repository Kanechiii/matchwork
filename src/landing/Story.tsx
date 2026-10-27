import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useMotionValueEvent, useScroll, useTransform } from "motion/react";
import type { MatchEvent, SyntheticMatch } from "../types/match";
import { EventIcon } from "../components/EventIcon";
import { Pitch } from "../components/Pitch";
import { EASE_OUT, SPRING_BAR, STAGGER, swap } from "../motion";
import { clock, frameAt, type SampleModel, type useSampleMoment } from "./sample";

type Sample = ReturnType<typeof useSampleMoment>;

const STEPS = [
  { kicker: "Events", title: "It starts with 1,200 events.", body: "A seeded generator writes a complete fictional match: passes, shots, tackles, pressure and turnovers, each with a timestamp and a position on the pitch. The same seed always produces the same match, so every demo is reproducible." },
  { kicker: "Replay clock", title: "Only the past is known.", body: "Score, statistics and explanations are computed only from events at or before the replay clock. Scroll and the match unfolds. Nothing from later in the game leaks into what you see." },
  { kicker: "Rolling window", title: "Three minutes reveal the rhythm.", body: "The latest three minutes are summarised into seven features: pass completion, pressure, turnovers, shots, tempo, attacking territory and score tension." },
  { kicker: "In-browser model", title: "A model names the spell.", body: "Microsoft ONNX Runtime Web runs a small classifier right in your browser and labels the window as control, pressure or transition. It is trained on synthetic prototypes, so its scores are illustrative, not calibrated predictions." },
  { kicker: "Evidence", title: "Every explanation shows its sources.", body: "Pause the replay and Matchwork asks for an explanation that cites the event IDs it used. If Microsoft Foundry is unavailable or over budget, a rules-based recap takes over and the studio labels it as such." },
];

const TYPE_LABELS: Record<MatchEvent["type"], string> = {
  pass: "Passes", shot: "Shots", tackle: "Tackles", pressure: "Pressures", possession_change: "Turnovers",
};
const FEATURE_LABELS = ["Pass completion", "Pressure", "Turnovers", "Shots", "Tempo", "Territory", "Tension"];

function Bar({ value, delay = 0, tone = "neutral" }: { value: number; delay?: number; tone?: "neutral" | "accent" }) {
  return (
    <span className="lp-bar">
      <motion.span className={`lp-bar-fill is-${tone}`} initial={{ width: 0 }} animate={{ width: `${Math.max(0, Math.min(1, value)) * 100}%` }} transition={{ ...SPRING_BAR, delay }} />
    </span>
  );
}

function StagePanel({ step, match, sample, time, model }: { step: number; match: SyntheticMatch; sample: Sample; time: number; model: SampleModel }) {
  const counts = useMemo(() => {
    const result: Record<MatchEvent["type"], number> = { pass: 0, shot: 0, tackle: 0, pressure: 0, possession_change: 0 };
    for (const event of match.events) { if (event.elapsedSeconds <= time) result[event.type] += 1; }
    return result;
  }, [match, time]);
  const frame = useMemo(() => frameAt(match, time), [match, time]);
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  const f = sample.features;

  if (step === 0) {
    return (
      <div className="lp-panel">
        <div className="lp-panel-head"><span>Events so far</span><strong className="tabular">{total.toLocaleString()} <small>of {match.events.length.toLocaleString()}</small></strong></div>
        <ul className="lp-type-list">
          {(Object.keys(TYPE_LABELS) as MatchEvent["type"][]).map((type) => (
            <li key={type}><span className="lp-type-icon"><EventIcon type={type} /></span>{TYPE_LABELS[type]}<strong className="tabular">{counts[type]}</strong></li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === 1) {
    const s = frame.stats;
    return (
      <div className="lp-panel">
        <div className="lp-panel-head"><span>Known at this moment</span><strong className="tabular">{clock(time)}</strong></div>
        <span className="lp-bar lp-bar-lg"><span className="lp-bar-fill is-accent" style={{ width: `${(100 * time) / match.metadata.durationSeconds}%` }} /></span>
        <dl className="lp-mini-stats tabular">
          <div><dt>Score</dt><dd>{s.home.goals}–{s.away.goals}</dd></div>
          <div><dt>Shots</dt><dd>{s.home.shots}–{s.away.shots}</dd></div>
          <div><dt>Pass accuracy</dt><dd>{Math.round(s.home.passCompletionPct)}% · {Math.round(s.away.passCompletionPct)}%</dd></div>
        </dl>
        <p className="lp-panel-note">Events after {clock(time)} have not happened yet.</p>
      </div>
    );
  }
  if (step === 2) {
    return (
      <div className="lp-panel">
        <div className="lp-panel-head"><span>Window</span><strong className="tabular">{clock(f.startSeconds)}–{clock(f.endSeconds)}</strong></div>
        <ul className="lp-feature-list">
          {f.values.map((value, i) => (
            <motion.li key={FEATURE_LABELS[i]} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.4, ease: EASE_OUT, delay: i * STAGGER }}>
              <span>{FEATURE_LABELS[i]}</span><Bar value={value} delay={0.1 + i * STAGGER} /><strong className="tabular">{value.toFixed(2)}</strong>
            </motion.li>
          ))}
        </ul>
      </div>
    );
  }
  if (step === 3) {
    const p = model.prediction;
    const top = p ? Math.max(...p.probabilities) : null;
    return (
      <div className="lp-panel">
        <div className="lp-panel-head">
          <span>Classifier output</span>
          <span className={`lp-model-state is-${model.status}`}><i aria-hidden="true" />{model.status === "ready" ? "ONNX Runtime Web" : model.status === "unavailable" ? "Model unavailable here" : "Loading model"}</span>
        </div>
        {p ? (
          <ul className="lp-prob-list">
            {(["Control", "Pressure", "Transition"] as const).map((label, i) => (
              <li key={label} className={p.probabilities[i] === top ? "is-top" : ""}>
                <span>{label}</span><Bar value={p.probabilities[i]} delay={i * STAGGER} tone={p.probabilities[i] === top ? "accent" : "neutral"} /><strong className="tabular">{(p.probabilities[i] * 100).toFixed(1)}%</strong>
              </li>
            ))}
          </ul>
        ) : (
          <p className="lp-panel-note">{model.status === "unavailable" ? "The runtime could not load in this browser. The studio reports the same status rather than inventing a result." : "Running the real classifier on this window…"}</p>
        )}
        <p className="lp-panel-note">Illustrative synthetic-model scores, not calibrated probabilities.</p>
      </div>
    );
  }
  return (
    <div className="lp-panel">
      <div className="lp-panel-head"><span>Rules-based recap</span><strong className="tabular">{clock(sample.time)}</strong></div>
      <p className="lp-panel-quote">{sample.recap}</p>
      <div className="lp-cites">
        <span>Cites</span>
        {f.eventIds.slice(-5).map((id, i) => (
          <motion.code key={id} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.15 + i * STAGGER }}>{id}</motion.code>
        ))}
      </div>
    </div>
  );
}

function StepText({ index, onActive, eventCount }: { index: number; onActive: (i: number) => void; eventCount: number }) {
  const ref = useRef<HTMLElement>(null);
  // On small screens the stage pins to the top, so chapters activate lower in the viewport.
  const [narrow] = useState(() => window.matchMedia("(max-width: 900px)").matches);
  const inView = useInView(ref, { margin: narrow ? "-70% 0px -20% 0px" : "-45% 0px -45% 0px" });
  useEffect(() => { if (inView) onActive(index); }, [inView, index, onActive]);
  const step = STEPS[index];
  return (
    <article ref={ref} className="lp-step" id={`story-${index + 1}`} data-active={inView || undefined}>
      <div className="lp-step-card">
        <span className="lp-step-kicker"><span className="tabular">0{index + 1}</span> {step.kicker}</span>
        <h3>{index === 0 ? `It starts with ${eventCount.toLocaleString()} events.` : step.title}</h3>
        <p>{step.body}</p>
      </div>
    </article>
  );
}

export function Story({ match, sample, model }: { match: SyntheticMatch; sample: Sample; model: SampleModel & { request: () => void } }) {
  const ref = useRef<HTMLElement>(null);
  const [step, setStep] = useState(0);
  const [time, setTime] = useState(0);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end end"] });
  const railScale = useTransform(scrollYProgress, [0, 1], [0, 1]);
  const { request } = model;

  // The first two chapters scrub the clock from kick-off to the sample moment.
  useMotionValueEvent(scrollYProgress, "change", (v) => {
    const t = Math.min(1, Math.max(0, v / 0.38)) * sample.time;
    setTime(Math.min(sample.time, Math.round(t / 15) * 15));
  });
  useEffect(() => { if (step >= 2) request(); }, [step, request]);

  const frame = useMemo(() => frameAt(match, time), [match, time]);
  const trail = useMemo(() => match.events.slice(0, frame.stats.processedEvents), [match, frame.stats.processedEvents]);
  const windowView = step >= 2;
  const homeTeam = match.metadata.homeTeam;
  const awayTeam = match.metadata.awayTeam;

  const goTo = (i: number) => document.getElementById(`story-${i + 1}`)?.scrollIntoView({ behavior: "smooth", block: "center" });

  return (
    <section className="lp-story" id="story" ref={ref} aria-labelledby="story-title">
      <div className="lp-story-intro">
        <h2 id="story-title">How a moment becomes an insight.</h2>
        <p>Scroll through one real moment of the fictional match, from raw events to an explanation you can check.</p>
      </div>
      <div className="lp-story-grid">
        <div className="lp-steps">
          <div className="lp-steps-rail" aria-hidden="true"><motion.span style={{ scaleY: railScale }} /></div>
          {STEPS.map((_, i) => <StepText key={i} index={i} onActive={setStep} eventCount={match.events.length} />)}
        </div>
        <div className="lp-stage-wrap">
          <div className="lp-stage">
            <div className="lp-stage-head">
              <span className="lp-team"><i className="lp-chip is-home">{homeTeam.abbreviation}</i></span>
              <strong className="tabular">{frame.stats.home.goals}–{frame.stats.away.goals}</strong>
              <span className="lp-team"><i className="lp-chip is-away">{awayTeam.abbreviation}</i></span>
              <span className="lp-stage-clock tabular">{clock(windowView ? sample.time : time)}</span>
            </div>
            <div className="lp-stage-pitch">
              <Pitch
                events={windowView ? sample.windowEvents : frame.recentEvents}
                trail={windowView ? sample.trail : trail}
                homeId={homeTeam.id}
                label={windowView ? "Events in the three-minute window, highlighted over the match so far" : "Event positions so far"}
              />
            </div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={step} {...swap}>
                <StagePanel step={step} match={match} sample={sample} time={time} model={model} />
              </motion.div>
            </AnimatePresence>
            <nav className="lp-stage-steps" aria-label="Story chapters">
              {STEPS.map((s, i) => (
                <button key={s.kicker} type="button" aria-current={step === i ? "step" : undefined} onClick={() => goTo(i)} aria-label={`Chapter ${i + 1}: ${s.kicker}`}>
                  <span className="lp-stage-step-num tabular">{i + 1}</span>
                  {step === i && <motion.span layoutId="story-step-thumb" className="lp-stage-step-thumb" transition={{ type: "spring", stiffness: 500, damping: 40 }} />}
                </button>
              ))}
            </nav>
          </div>
        </div>
      </div>
    </section>
  );
}
