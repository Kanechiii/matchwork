import { useMemo } from "react";
import { ArrowRight, Info } from "lucide-react";
import type { SyntheticMatch } from "./types/match";
import { createReplayState, getReplayFrame, seekReplay } from "./engine/replay";
import { extractWindowFeatures } from "./ai/features";
import { buildMatchRecap } from "./ai/explanations";
import { Brand } from "./components/Brand";
import { ThemeToggle } from "./components/ThemeToggle";
import { Pitch } from "./components/Pitch";
import "./LandingPage.css";

interface LandingPageProps {
  match: SyntheticMatch;
}

function clock(seconds: number) {
  return `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}`;
}

/** A real snapshot of the studio at one moment, built with the same engine the studio uses. */
function useSampleMoment(match: SyntheticMatch) {
  return useMemo(() => {
    const firstGoal = match.events.find((e) => e.type === "shot" && e.outcome === "goal");
    const time = Math.min(match.metadata.durationSeconds, firstGoal ? firstGoal.elapsedSeconds + 20 : 1458);
    const frame = getReplayFrame(match, seekReplay(createReplayState(match), match, time));
    const features = extractWindowFeatures(match, time);
    return { time, frame, features, recap: buildMatchRecap(match, time) };
  }, [match]);
}

const pipeline = [
  { title: "Events", body: "A seeded generator produces every pass, shot, tackle, pressure and turnover, each with a timestamp and a pitch position." },
  { title: "Replay window", body: "As the clock moves, statistics update and a rolling three-minute window summarises the latest spell of play." },
  { title: "Classifier", body: "A small ONNX model runs in your browser and labels that spell as control, pressure or transition." },
  { title: "Explanation", body: "Pause the replay and Matchwork requests a written explanation. If the AI service is unavailable, a rules-based recap takes over and says so." },
];

const principles = [
  { term: "Fictional by design", detail: "Every team, player and event is synthetic. Nothing comes from live Premier League data or footage." },
  { term: "Scores are illustrative", detail: "Classifier outputs come from a model trained on synthetic prototypes. They are not calibrated predictions." },
  { term: "Fallbacks are disclosed", detail: "When the AI service or the in-browser model is unavailable, the studio labels the rules-based result instead of guessing." },
  { term: "Evidence you can trace", detail: "Explanations list the event IDs they were built from, so you can check each one against the event stream." },
];

function LandingPage({ match }: LandingPageProps) {
  const homeTeam = match.metadata.homeTeam;
  const awayTeam = match.metadata.awayTeam;
  const sample = useSampleMoment(match);
  const { home, away } = sample.frame.stats;
  const evidenceIds = sample.features.eventIds.slice(-4);

  return (
    <div className="lp">
      <a className="lp-skip" href="#lp-main">Skip to content</a>
      <header className="lp-header">
        <div className="lp-header-inner">
          <Brand href="#top" label="Matchwork home" />
          <nav className="lp-nav" aria-label="Landing page">
            <a href="#how">How it works</a>
            <a href="#views">Fan and analyst views</a>
            <a href="#transparency">Transparency</a>
          </nav>
          <div className="lp-header-end">
            <ThemeToggle />
            <a className="btn btn-primary lp-header-cta" href="#/studio">Open the studio</a>
          </div>
        </div>
      </header>

      <main id="lp-main">
        <section className="lp-hero" id="top">
          <div className="lp-hero-copy">
            <p className="lp-overline">Built for Inside the Game, a Microsoft × Premier League developer hackathon</p>
            <h1>Every match has a story between the goals.</h1>
            <p className="lp-lede">Matchwork replays a fictional 90-minute match event by event and explains what each spell of play means, citing the exact events behind every explanation.</p>
            <div className="lp-actions">
              <a href="#/studio" className="btn btn-primary btn-lg">Open the match studio <ArrowRight aria-hidden="true" /></a>
              <a href="#how" className="btn btn-secondary btn-lg">See how it works</a>
            </div>
            <p className="lp-note"><Info aria-hidden="true" /> Fictional teams and synthetic events. No live Premier League data.</p>
          </div>

          <figure className="lp-preview" aria-label={`Studio snapshot at ${clock(sample.time)}`}>
            <div className="lp-preview-head">
              <span>Studio snapshot</span>
              <span className="tabular">{clock(sample.time)} / {clock(match.metadata.durationSeconds)}</span>
            </div>
            <div className="lp-preview-score">
              <span className="lp-team"><i className="lp-chip is-home">{homeTeam.abbreviation}</i>{homeTeam.name}</span>
              <strong className="tabular" aria-label={`${home.goals} to ${away.goals}`}>{home.goals}<span>–</span>{away.goals}</strong>
              <span className="lp-team lp-team-away">{awayTeam.name}<i className="lp-chip is-away">{awayTeam.abbreviation}</i></span>
            </div>
            <div className="lp-preview-pitch">
              <Pitch events={sample.frame.recentEvents.slice(-6)} homeId={homeTeam.id} label="Positions of the six most recent events at this moment" />
            </div>
            <div className="lp-preview-body">
              <span className="lp-preview-label">The story so far</span>
              <p>{sample.recap}</p>
            </div>
            <figcaption className="lp-preview-foot">
              <span>Cites</span>
              {evidenceIds.length ? evidenceIds.map((id) => <code key={id}>{id}</code>) : <span>no events in this window</span>}
            </figcaption>
          </figure>
        </section>

        <section className="lp-section" id="how" aria-labelledby="how-title">
          <div className="lp-section-head">
            <h2 id="how-title">From raw events to an explanation you can check.</h2>
            <p>Each step uses only what has happened up to the replay clock. Nothing later in the match leaks into an explanation.</p>
          </div>
          <ol className="lp-pipeline">
            {pipeline.map((step, i) => (
              <li key={step.title}>
                <span className="lp-step-index tabular">{i + 1}</span>
                <h3>{step.title}</h3>
                <p>{step.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-section lp-views" id="views" aria-labelledby="views-title">
          <div className="lp-section-head">
            <h2 id="views-title">One moment, two levels of detail.</h2>
            <p>Switch views at any time without losing your place in the replay. Here is the same moment, {clock(sample.time)}, in each.</p>
          </div>
          <div className="lp-compare">
            <article className="lp-view">
              <header><h3>Fan view</h3><p>The story in plain language.</p></header>
              <blockquote>{sample.recap}</blockquote>
              <ul>
                <li>A short read on the current spell of play</li>
                <li>A quick recap of the match so far</li>
                <li>Where the latest action happened</li>
              </ul>
            </article>
            <article className="lp-view">
              <header><h3>Analyst view</h3><p>The evidence behind the story.</p></header>
              <dl className="lp-evidence">
                <div><dt>Passes</dt><dd className="tabular">{sample.features.passesCompleted}/{sample.features.passesAttempted}</dd></div>
                <div><dt>Pressures</dt><dd className="tabular">{sample.features.pressures}</dd></div>
                <div><dt>Turnovers</dt><dd className="tabular">{sample.features.turnovers}</dd></div>
                <div><dt>Shots</dt><dd className="tabular">{sample.features.shots}</dd></div>
              </dl>
              <ul>
                <li>Classifier scores for control, pressure and transition</li>
                <li>Feature window, sample time and model status</li>
                <li>Observed event IDs and the full event stream</li>
              </ul>
            </article>
          </div>
        </section>

        <section className="lp-section lp-transparency" id="transparency" aria-labelledby="transparency-title">
          <div className="lp-section-head">
            <h2 id="transparency-title">Built to show its working.</h2>
            <p>A visible explanation is only useful if you know where it came from.</p>
          </div>
          <dl className="lp-principles">
            {principles.map((p) => (
              <div key={p.term}><dt>{p.term}</dt><dd>{p.detail}</dd></div>
            ))}
          </dl>
        </section>

        <section className="lp-close" aria-labelledby="close-title">
          <div>
            <h2 id="close-title">Pick a moment and see what it means.</h2>
            <p>One fictional match, fully replayable. No account needed.</p>
          </div>
          <a href="#/studio" className="btn btn-primary btn-lg">Open the match studio <ArrowRight aria-hidden="true" /></a>
        </section>
      </main>

      <footer className="lp-footer">
        <span>Matchwork. The game, understood.</span>
        <span>Demonstration with fictional teams and synthetic events.</span>
        <a href="#top">Back to top</a>
      </footer>
    </div>
  );
}

export default LandingPage;
