
import { useEffect, useState } from "react";
import type { MatchEvent } from "./types/match";
import { demoMatch } from "./data/demoMatch";
import { generateSyntheticMatch } from "./engine/generateEvents";
import {
  advanceReplay,
  createReplayState,
  getReplayFrame,
  pauseReplay,
  playReplay,
  restartReplay,
  seekReplay,
  setReplaySpeed,
} from "./engine/replay";
import { extractWindowFeatures } from "./ai/features";
import { predictMatchState, type MatchPrediction } from "./ai/inference";
import { explainMatchState, buildMatchRecap, type AudienceMode } from "./ai/explanations";
import type { TeamId } from "./types/match";
import "./App.css";

// Generated once, outside React rendering.
const match = generateSyntheticMatch(demoMatch);

function formatClock(seconds: number): string {
  const minutes = Math.floor(seconds / 60);
  const remaining = seconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(
    remaining,
  ).padStart(2, "0")}`;
}

function describeEvent(event: MatchEvent): string {
  switch (event.type) {
    case "pass":
      return event.completed
        ? "Completed pass"
        : "Incomplete pass";

    case "shot":
      return `Shot — ${event.outcome.replaceAll("_", " ")}`;

    case "tackle":
      return event.wonBall
        ? "Successful tackle"
        : "Unsuccessful tackle";

    case "pressure":
      return `Defensive pressure — level ${event.intensity}`;

    case "possession_change":
      return `Possession change — ${event.reason.replaceAll(
        "_",
        " ",
      )}`;
  }
}

interface StatRowProps {
  label: string;
  home: string | number;
  away: string | number;
}

function StatRow({ label, home, away }: StatRowProps) {
  return (
    <div className="mw-stat-row">
      <strong>{home}</strong>
      <span>{label}</span>
      <strong>{away}</strong>
    </div>
  );
}

function App() {
  const [replay, setReplay] = useState(() =>
    createReplayState(match),
  );

  const [audience, setAudience] = useState<AudienceMode>("fan");
  const [favoriteTeam, setFavoriteTeam] = useState<TeamId | "all">("all");
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null);
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [modelError, setModelError] = useState("");
  const insightWindow = Math.floor(replay.elapsedSeconds / 15);

  useEffect(() => {
    let current = true;
    const clock = Math.min(match.metadata.durationSeconds, insightWindow * 15);
    predictMatchState(extractWindowFeatures(match, clock))
      .then((result) => {
        if (!current) return;
        setPrediction(result);
        setModelStatus("ready");
        setModelError("");
      })
      .catch((error: unknown) => {
        if (!current) return;
        setPrediction(null);
        setModelStatus("unavailable");
        setModelError(error instanceof Error ? error.message : "Model could not be loaded");
      });
    return () => { current = false; };
  }, [insightWindow]);

  const windowFeatures = extractWindowFeatures(match, replay.elapsedSeconds);
  const insight = explainMatchState(windowFeatures, modelStatus === "ready" ? prediction : null, audience, favoriteTeam, match);
  const recap = buildMatchRecap(match, replay.elapsedSeconds);

  // Advance simulated time using measured real elapsed time.
  useEffect(() => {
    if (replay.status !== "playing") {
      return;
    }

    let previousTime = performance.now();

    const timer = window.setInterval(() => {
      const currentTime = performance.now();
      const delta = currentTime - previousTime;
      previousTime = currentTime;

      setReplay((current) =>
        advanceReplay(current, match, delta),
      );
    }, 100);

    return () => window.clearInterval(timer);
  }, [replay.status]);

  const frame = getReplayFrame(match, replay);
  const { home, away } = frame.stats;

  const isPlaying = replay.status === "playing";

  return (
    <main className="mw-app">
      <div className="mw-container">
        <header className="mw-header">
          <div>
            <div className="mw-eyebrow">
              SYNTHETIC FOOTBALL INTELLIGENCE
            </div>
            <h1>Matchwork<span className="mw-dot">.</span></h1>
            <p>The game, understood.</p>
          </div>

          <span className="mw-demo-tag">DEMO MATCH</span>
        </header>

        <section className="mw-panel" aria-label="Match scoreboard">
          <div className="mw-match-meta">
            <span>FICTIONAL MATCH • 90 MINUTES</span>
            <span className="mw-status">
              {replay.status === "finished"
                ? "FULL TIME"
                : isPlaying
                  ? "REPLAYING"
                  : "PAUSED"}
            </span>
          </div>

          <div className="mw-scoreboard">
            <div className="mw-team">
              <span
                className="mw-team-color"
                style={{
                  backgroundColor: match.metadata.homeTeam.color,
                }}
              />
              <strong>{match.metadata.homeTeam.name}</strong>
              <small>{match.metadata.homeTeam.abbreviation}</small>
            </div>

            <div className="mw-score" aria-live="polite">
              {home.goals} <span>:</span> {away.goals}
            </div>

            <div className="mw-team">
              <span
                className="mw-team-color"
                style={{
                  backgroundColor: match.metadata.awayTeam.color,
                }}
              />
              <strong>{match.metadata.awayTeam.name}</strong>
              <small>{match.metadata.awayTeam.abbreviation}</small>
            </div>
          </div>

          <div className="mw-clock">
            {formatClock(replay.elapsedSeconds)}
            <span> / 90:00</span>
          </div>

          <label className="mw-slider-label" htmlFor="match-progress">
            Match timeline
          </label>
          <input
            id="match-progress"
            className="mw-slider"
            type="range"
            min={0}
            max={match.metadata.durationSeconds}
            step={1}
            value={replay.elapsedSeconds}
            onChange={(event) =>
              setReplay((current) =>
                seekReplay(
                  current,
                  match,
                  Number(event.target.value),
                ),
              )
            }
          />

          <div className="mw-timeline-labels">
            <span>00:00</span>
            <span>45:00</span>
            <span>90:00</span>
          </div>

          <div className="mw-controls">
            <button
              type="button"
              onClick={() =>
                setReplay((current) =>
                  isPlaying
                    ? pauseReplay(current)
                    : playReplay(current, match),
                )
              }
              disabled={replay.status === "finished"}
              className="mw-primary"
            >
              {isPlaying ? "Pause" : "Play"}
            </button>

            <button
              type="button"
              onClick={() =>
                setReplay((current) => restartReplay(current))
              }
            >
              Restart
            </button>

            <label className="mw-speed-label" htmlFor="replay-speed">
              Speed
              <select
                id="replay-speed"
                value={replay.speed}
                onChange={(event) =>
                  setReplay((current) =>
                    setReplaySpeed(
                      current,
                      Number(event.target.value),
                    ),
                  )
                }
              >
                <option value={1}>1×</option>
                <option value={4}>4×</option>
                <option value={16}>16×</option>
              </select>
            </label>
          </div>
        </section>

        <section className="mw-panel mw-intelligence" aria-label="Explainable Match Intelligence">
          <div className="mw-section-title">
            <h2>Explainable Match Intelligence</h2>
            <span>ROLLING 3-MIN WINDOW</span>
          </div>
          <div className="mw-insight-controls">
            <label htmlFor="audience-mode">Viewing mode
              <select id="audience-mode" value={audience}
                onChange={(event) => setAudience(event.target.value as AudienceMode)}>
                <option value="fan">Fan — The story</option>
                <option value="analyst">Analyst — Evidence and features</option>
              </select>
            </label>
            <label htmlFor="focus-team">Team focus
              <select id="focus-team" value={favoriteTeam}
                onChange={(event) => setFavoriteTeam(event.target.value as TeamId | "all")}>
                <option value="all">Both teams</option>
                <option value="northbridge">Northbridge Rovers</option>
                <option value="harborpoint">Harborpoint FC</option>
              </select>
            </label>
          </div>
          <p className="mw-model-status" role="status">
            {modelStatus === "ready"
              ? "Microsoft ONNX Runtime Web · WASM · Synthetic-trained classifier"
              : modelStatus === "loading"
                ? "Loading Microsoft ONNX model..."
                : "AI unavailable — event statistics and recap remain active"}
          </p>
          <h3 className="mw-insight-headline">{insight.headline}</h3>
          <p className="mw-insight-narrative">{insight.narrative}</p>
          <p className="mw-why">{insight.whyItMatters}</p>
          {modelStatus === "unavailable" && <small className="mw-error">Runtime error: {modelError}</small>}
          <div className="mw-evidence" aria-label="Insight evidence">
            {insight.evidence.map((datum) => <span key={datum}>{datum}</span>)}
          </div>
          {audience === "analyst" && <div className="mw-analyst-detail">
            <strong>Traceable event IDs</strong>
            <p>{insight.evidenceEventIds.join(", ") || "No events in this time window"}</p>
            {prediction && modelStatus === "ready" && <p>Model scores: CONTROL {(prediction.probabilities[0] * 100).toFixed(1)}% · PRESSURE {(prediction.probabilities[1] * 100).toFixed(1)}% · TRANSITION {(prediction.probabilities[2] * 100).toFixed(1)}%</p>}
          </div>}
          <div className="mw-recap"><strong>Automated event recap</strong><p>{recap}</p></div>
          <small className="mw-disclaimer">Demonstration: synthetic events and training labels. Model confidence is not real-world predictive accuracy; recap is generated from observed events.</small>
        </section>

        <div className="mw-grid">
          <section className="mw-panel" aria-label="Match statistics">
            <div className="mw-section-title">
              <h2>Live Match Statistics</h2>
              <span>AS OF {formatClock(replay.elapsedSeconds)}</span>
            </div>

            <div className="mw-stat-head">
              <span>{match.metadata.homeTeam.abbreviation}</span>
              <span>STATISTIC</span>
              <span>{match.metadata.awayTeam.abbreviation}</span>
            </div>

            <StatRow
              label="Possession"
              home={`${home.possessionPct}%`}
              away={`${away.possessionPct}%`}
            />
            <StatRow
              label="Total shots"
              home={home.shots}
              away={away.shots}
            />
            <StatRow
              label="Shots on target"
              home={home.shotsOnTarget}
              away={away.shotsOnTarget}
            />
            <StatRow
              label="Passes attempted"
              home={home.passesAttempted}
              away={away.passesAttempted}
            />
            <StatRow
              label="Completed passes"
              home={home.passesCompleted}
              away={away.passesCompleted}
            />
            <StatRow
              label="Pass accuracy"
              home={`${home.passCompletionPct}%`}
              away={`${away.passCompletionPct}%`}
            />
            <StatRow
              label="Tackles won"
              home={home.tacklesWon}
              away={away.tacklesWon}
            />
            <StatRow
              label="Defensive pressures"
              home={home.pressuresApplied}
              away={away.pressuresApplied}
            />
          </section>

          <section className="mw-panel" aria-label="Event feed">
            <div className="mw-section-title">
              <h2>Match Event Feed</h2>
              <span>{frame.stats.processedEvents} / 1200</span>
            </div>

            <div className="mw-feed">
              {frame.recentEvents.length === 0 ? (
                <p className="mw-empty">No events yet.</p>
              ) : (
                frame.recentEvents
                  .slice()
                  .reverse()
                  .map((event) => (
                    <div className="mw-event" key={event.id}>
                      <span className="mw-event-time">
                        {formatClock(event.elapsedSeconds)}
                      </span>

                      <div>
                        <strong>{describeEvent(event)}</strong>
                        <small>
                          {event.teamId ===
                          match.metadata.homeTeam.id
                            ? match.metadata.homeTeam.abbreviation
                            : match.metadata.awayTeam.abbreviation}
                          {" • "}
                          {event.playerId}
                        </small>
                      </div>
                    </div>
                  ))
              )}
            </div>
          </section>
        </div>

        <footer className="mw-footer">
          Matchwork • Synthetic demonstration data •
          No real match footage or live Premier League data
        </footer>
      </div>
    </main>
  );
}

export default App;
