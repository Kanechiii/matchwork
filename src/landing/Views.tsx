import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView } from "motion/react";
import { ChartColumn, Users } from "lucide-react";
import type { SyntheticMatch } from "../types/match";
import { explainMatchState, type AudienceMode } from "../ai/explanations";
import { Segmented } from "../components/Segmented";
import { EASE_OUT, SPRING_BAR, STAGGER, reveal, swap } from "../motion";
import { clock, type SampleModel, type useSampleMoment } from "./sample";

type Sample = ReturnType<typeof useSampleMoment>;

/** The same moment, explained by the real explanation function for each audience. */
export function Views({ match, sample, model }: { match: SyntheticMatch; sample: Sample; model: SampleModel & { request: () => void } }) {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, amount: 0.2 });
  const [mode, setMode] = useState<AudienceMode>("fan");
  const { request } = model;
  useEffect(() => { if (inView) request(); }, [inView, request]);

  const ready = model.status === "ready";
  const explained = explainMatchState(sample.features, model.prediction, mode, "all", match);
  // Without a model result, Fan view falls back to the observed-event recap, as the studio does.
  const insight = !ready && mode === "fan"
    ? { ...explained, headline: "The story so far", narrative: sample.recap, whyItMatters: "Every update comes from events already shown in the replay." }
    : explained;

  return (
    <section className="lp-section lp-views" id="views" ref={ref} aria-labelledby="views-title">
      <div className="lp-views-grid">
        <motion.div className="lp-views-copy" {...reveal()}>
          <h2 id="views-title">Detailed insight for every team, at the depth you need.</h2>
          <p>Follow both sides or pick the team you care about, and the explanation re-targets to them. Fan view keeps the game human; Analyst view opens up the scores, features and event IDs behind the same explanation.</p>
          <div className="lp-views-controls">
            <Segmented id="lp-mode" label="Choose a view" value={mode} onChange={setMode} options={[
              { value: "fan", label: "Fan view", icon: <Users aria-hidden="true" /> },
              { value: "analyst", label: "Analyst view", icon: <ChartColumn aria-hidden="true" /> },
            ]} />
          </div>
          <p className="lp-views-note">Generated live in your browser by the studio's own explanation code for {clock(sample.time)}.{ready ? "" : model.status === "unavailable" ? " The ONNX model could not load here, so you see the honest unavailable state." : " Loading the ONNX model…"}</p>
        </motion.div>

        <motion.article className={`lp-view-card is-${mode}`} {...reveal(0.1)} aria-live="polite">
          <header className="lp-view-card-head">
            <span>{mode === "fan" ? "What's happening?" : "Match intelligence"}</span>
            <span className="tabular">{clock(sample.time)}</span>
          </header>
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={`${mode}-${insight.headline}`} {...swap} className="lp-view-card-body">
              <h3>{insight.headline}</h3>
              <p>{insight.narrative}</p>
              <div className="lp-view-why"><span>{mode === "fan" ? "Why it matters" : "Interpretation"}</span><p>{insight.whyItMatters}</p></div>
              {mode === "analyst" && (
                <>
                  {model.prediction && (
                    <ul className="lp-prob-list">
                      {(["Control", "Pressure", "Transition"] as const).map((label, i) => {
                        const value = model.prediction!.probabilities[i];
                        const top = value === Math.max(...model.prediction!.probabilities);
                        return (
                          <li key={label} className={top ? "is-top" : ""}>
                            <span>{label}</span>
                            <span className="lp-bar"><motion.span className={`lp-bar-fill is-${top ? "accent" : "neutral"}`} initial={{ width: 0 }} animate={{ width: `${value * 100}%` }} transition={{ ...SPRING_BAR, delay: i * STAGGER }} /></span>
                            <strong className="tabular">{(value * 100).toFixed(1)}%</strong>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                  <ul className="lp-chip-list">
                    {insight.evidence.map((item, i) => (
                      <motion.li key={item} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.35, ease: EASE_OUT, delay: 0.1 + i * STAGGER }}>{item}</motion.li>
                    ))}
                  </ul>
                  <div className="lp-cites"><span>Event IDs</span>{insight.evidenceEventIds.map((id) => <code key={id}>{id}</code>)}</div>
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </motion.article>
      </div>
    </section>
  );
}
