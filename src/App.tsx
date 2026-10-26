import { useEffect, useRef, useState } from "react";
import type { MatchEvent, TeamId } from "./types/match";
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
import {
  createPredictionRequestGate,
  predictMatchState,
  type MatchPrediction,
} from "./ai/inference";
import {
  explainMatchState,
  buildMatchRecap,
  type AudienceMode,
} from "./ai/explanations";
import "./App.css";

// Generate the synthetic match once, outside React rendering.
const match = generateSyntheticMatch(demoMatch);

function formatClock(seconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remaining = safeSeconds % 60;

  return `${String(minutes).padStart(2, "0")}:${String(remaining).padStart(2, "0")}`;
}

function describeEvent(event: MatchEvent): string {
  switch (event.type) {
    case "pass":
      return event.completed ? "Completed pass" : "Incomplete pass";
    case "shot":
      return `Shot — ${event.outcome.replaceAll("_", " ")}`;
    case "tackle":
      return event.wonBall ? "Successful tackle" : "Unsuccessful tackle";
    case "pressure":
      return `Defensive pressure — level ${event.intensity}`;
    case "possession_change":
      return `Possession change — ${event.reason.replaceAll("_", " ")}`;
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
  const [replay, setReplay] = useState(() => createReplayState(match));
  const [audience, setAudience] = useState<AudienceMode>("fan");
  const [favoriteTeam, setFavoriteTeam] = useState<TeamId | "all">("all");
  const [modelAttempt, setModelAttempt] = useState(0);
  const [dismissedBroadcastEventId, setDismissedBroadcastEventId] =
    useState<string | null>(null);

  // Store completed results by their sample timestamp and retry attempt.
  // Loading is derived from whether a matching result exists.
  const [modelResult, setModelResult] = useState<{
    asOfSeconds: number;
    attempt: number;
    status: "ready" | "unavailable";
    prediction: MatchPrediction | null;
    error: string;
  } | null>(null);

  const requestGate = useRef(createPredictionRequestGate());

  // Model samples occur at 15-second replay boundaries.
  // At replay 00:16, the model sample is 00:15.
  const insightWindow = Math.floor(replay.elapsedSeconds / 15);
  const modelSnapshotSeconds = Math.min(
    match.metadata.durationSeconds,
    insightWindow * 15,
  );

  // All model features and explanations use the sampled time, not the live clock.
  const modelWindowFeatures = extractWindowFeatures(match, modelSnapshotSeconds);

  useEffect(() => {
    const gate = requestGate.current;
    const requestId = gate.begin();
    const features = extractWindowFeatures(match, modelSnapshotSeconds);

    predictMatchState(features, modelSnapshotSeconds)
      .then((result) => {
        if (!gate.isCurrent(requestId)) return;

        if (result.asOfSeconds !== modelSnapshotSeconds) {
          setModelResult({
            asOfSeconds: modelSnapshotSeconds,
            attempt: modelAttempt,
            status: "unavailable",
            prediction: null,
            error: "Prediction timestamp did not match the requested sample.",
          });
          return;
        }

        setModelResult({
          asOfSeconds: modelSnapshotSeconds,
          attempt: modelAttempt,
          status: "ready",
          prediction: result,
          error: "",
        });
      })
      .catch((error: unknown) => {
        if (!gate.isCurrent(requestId)) return;

        setModelResult({
          asOfSeconds: modelSnapshotSeconds,
          attempt: modelAttempt,
          status: "unavailable",
          prediction: null,
          error: error instanceof Error ? error.message : "Model could not be loaded",
        });
      });

    return () => gate.cancel(requestId);
  }, [modelSnapshotSeconds, modelAttempt]);

  // Never display a result from another sample or retry attempt.
  const currentModelResult =
    modelResult?.asOfSeconds === modelSnapshotSeconds &&
    modelResult.attempt === modelAttempt
      ? modelResult
      : null;
  const modelStatus = currentModelResult?.status ?? "loading";
  const prediction = currentModelResult?.prediction ?? null;
  const modelError = currentModelResult?.error ?? "";

  const insight = explainMatchState(
    modelWindowFeatures,
    prediction,
    modelSnapshotSeconds,
    audience,
    favoriteTeam,
    match,
  );

  // The recap follows live replay time and never depends on ONNX.
  const recap = buildMatchRecap(match, replay.elapsedSeconds);

  // Advance simulated time using measured real elapsed time.
  useEffect(() => {
    if (replay.status !== "playing") return;

    let previousTime = performance.now();
    const timer = window.setInterval(() => {
      const currentTime = performance.now();
      const delta = currentTime - previousTime;
      previousTime = currentTime;
      setReplay((current) => advanceReplay(current, match, delta));
    }, 100);

    return () => window.clearInterval(timer);
  }, [replay.status]);

  const frame = getReplayFrame(match, replay);
  const { home, away } = frame.stats;
  const isPlaying = replay.status === "playing";

  // This event is already visible at the current replay position. Never use
  // a future match.events entry to create a broadcast insight.
  const broadcastEvent = frame.latestEvent;
  const showBroadcast =
    broadcastEvent !== null && broadcastEvent.id !== dismissedBroadcastEventId;

  const modelStatusText =
    modelStatus === "ready"
      ? `AI model available · Sample as of ${formatClock(modelSnapshotSeconds)}`
      : modelStatus === "loading"
        ? `Loading AI model for ${formatClock(modelSnapshotSeconds)}…`
        : "AI model unavailable · Replay and match data remain available";

  function retryModel() {
    setModelAttempt((attempt) => attempt + 1);
  }

  return (
    <main className="mw-app">
      <div className="mw-container">
        <header className="mw-header">
          <div>
            <div className="mw-eyebrow">SYNTHETIC FOOTBALL INTELLIGENCE</div>
            <h1>Matchwork<span className="mw-dot">.</span></h1>
            <p>The game, understood.</p>
          </div>
          <span className="mw-demo-tag">DEMO MATCH</span>
        </header>

        <section className="mw-panel" aria-label="Match scoreboard">
          <div className="mw-match-meta">
            <span>FICTIONAL MATCH • 90 MINUTES</span>
            <span className="mw-status">
              {replay.status === "finished" ? "FULL TIME" : isPlaying ? "REPLAYING" : "PAUSED"}
            </span>
          </div>

          <div className="mw-scoreboard">
            <div className="mw-team">
              <span className="mw-team-color" style={{ backgroundColor: match.metadata.homeTeam.color }} />
              <strong>{match.metadata.homeTeam.name}</strong>
              <small>{match.metadata.homeTeam.abbreviation}</small>
            </div>
            <div className="mw-score" aria-live="polite">
              {home.goals} <span>:</span> {away.goals}
            </div>
            <div className="mw-team">
              <span className="mw-team-color" style={{ backgroundColor: match.metadata.awayTeam.color }} />
              <strong>{match.metadata.awayTeam.name}</strong>
              <small>{match.metadata.awayTeam.abbreviation}</small>
            </div>
          </div>

          <div className="mw-clock">{formatClock(replay.elapsedSeconds)}<span> / 90:00</span></div>
          <label className="mw-slider-label" htmlFor="match-progress">Match timeline</label>
          <input
            id="match-progress"
            className="mw-slider"
            type="range"
            min={0}
            max={match.metadata.durationSeconds}
            step={1}
            value={replay.elapsedSeconds}
            onChange={(event) => setReplay((current) => seekReplay(current, match, Number(event.target.value)))}
          />
          <div className="mw-timeline-labels"><span>00:00</span><span>45:00</span><span>90:00</span></div>

          <div className="mw-controls">
            <button
              type="button"
              className="mw-primary"
              onClick={() => setReplay((current) => isPlaying ? pauseReplay(current) : playReplay(current, match))}
              disabled={replay.status === "finished"}
            >
              {isPlaying ? "Pause" : "Play"}
            </button>
            <button type="button" onClick={() => setReplay((current) => restartReplay(current))}>Restart</button>
            <label className="mw-speed-label" htmlFor="replay-speed">
              Speed
              <select
                id="replay-speed"
                value={replay.speed}
                onChange={(event) => setReplay((current) => setReplaySpeed(current, Number(event.target.value)))}
              >
                <option value={1}>1×</option>
                <option value={4}>4×</option>
                <option value={16}>16×</option>
              </select>
            </label>
          </div>
        </section>

        {showBroadcast && broadcastEvent && (
          <section className="mw-broadcast" aria-label="Replay broadcast insight">
            <div className="mw-broadcast-header">
              <div>
                <span className="mw-broadcast-label">MATCH MOMENT</span>
                <strong>
                  {formatClock(broadcastEvent.elapsedSeconds)}{" · "}
                  {broadcastEvent.teamId === match.metadata.homeTeam.id
                    ? match.metadata.homeTeam.name
                    : match.metadata.awayTeam.name}
                </strong>
              </div>
              <button
                type="button"
                className="mw-broadcast-dismiss"
                aria-label="Dismiss broadcast insight"
                onClick={() => setDismissedBroadcastEventId(broadcastEvent.id)}
              >
                <span aria-hidden="true">×</span><span>Dismiss</span>
              </button>
            </div>
            <p className="mw-broadcast-description">{describeEvent(broadcastEvent)}</p>
            <small className="mw-broadcast-source">
              {broadcastEvent.playerId} · Observed synthetic match event
            </small>
          </section>
        )}

        <section className={`mw-panel mw-intelligence mw-mode-${audience}`} aria-label="Explainable Match Intelligence">
          <div className="mw-section-title">
            <h2>Explainable Match Intelligence</h2>
            <span>{audience === "fan" ? "THE MATCH STORY" : "EVIDENCE & ANALYSIS"}</span>
          </div>

          <div className="mw-insight-controls">
            <label htmlFor="audience-mode">
              Viewing mode
              <select id="audience-mode" value={audience} onChange={(event) => setAudience(event.target.value as AudienceMode)}>
                <option value="fan">Fan — The story</option>
                <option value="analyst">Analyst — Evidence and features</option>
              </select>
            </label>
            <label htmlFor="focus-team">
              Team focus
              <select id="focus-team" value={favoriteTeam} onChange={(event) => setFavoriteTeam(event.target.value as TeamId | "all")}>
                <option value="all">Both teams</option>
                <option value="northbridge">Northbridge Rovers</option>
                <option value="harborpoint">Harborpoint FC</option>
              </select>
            </label>
          </div>

          <div className="mw-mode-banner">
            <strong>{audience === "fan" ? "Fan view" : "Analyst view"}</strong>
            <span>{audience === "fan" ? "A quick explanation of the match moment." : "Detailed evidence for the sampled replay window."}</span>
          </div>

          <p className="mw-model-status" role="status" aria-live="polite">{modelStatusText}</p>

          {modelStatus === "unavailable" && (
            <div className="mw-model-retry">
              <p>No prediction is available for this sample. Replay, statistics, event feed and recap remain usable.</p>
              <button type="button" onClick={retryModel}>Retry AI model</button>
              <small className="mw-error">Model error: {modelError}</small>
            </div>
          )}

          {audience === "analyst" && (
            <div className="mw-analyst-meta">
              <div className="mw-as-of"><span>LIVE REPLAY TIME</span><strong>{formatClock(replay.elapsedSeconds)}</strong></div>
              <div className="mw-as-of"><span>MODEL SAMPLE AS OF</span><strong>{formatClock(modelSnapshotSeconds)}</strong></div>
            </div>
          )}

          <h3 className="mw-insight-headline">{insight.headline}</h3>
          <p className="mw-insight-narrative">{insight.narrative}</p>
          <div className="mw-why-block">
            <strong>{audience === "fan" ? "Why it matters" : "Interpretation"}</strong>
            <p className="mw-why">{insight.whyItMatters}</p>
          </div>

          {audience === "fan" ? (
            <div className="mw-fan-evidence">
              <strong>What supports this insight?</strong>
              <div className="mw-evidence">{insight.evidence.slice(0, 2).map((datum) => <span key={datum}>{datum}</span>)}</div>
              <p>Synthetic match demonstration, not a prediction of real-world results. Evidence is from the model sample shown above, while the scoreboard follows live replay time.</p>
            </div>
          ) : (
            <div className="mw-analyst-content">
              <section className="mw-analyst-block" aria-label="Model output">
                <h4 className="mw-analyst-section-title">Model output</h4>
                <div className="mw-feature-grid">
                  <div className="mw-feature-chip"><span>Detected state</span><strong>{insight.state}</strong></div>
                  <div className="mw-feature-chip"><span>Model confidence</span><strong>{insight.confidence === null ? "Unavailable" : `${(insight.confidence * 100).toFixed(1)}%`}</strong></div>
                  <div className="mw-feature-chip"><span>Source</span><strong>{insight.modelBacked ? "ONNX model" : "Event statistics"}</strong></div>
                </div>
                {prediction && modelStatus === "ready" && prediction.asOfSeconds === modelSnapshotSeconds && (
                  <div className="mw-model-scores">
                    <strong>Model output scores · As of {formatClock(prediction.asOfSeconds)}</strong>
                    <p>CONTROL {(prediction.probabilities[0] * 100).toFixed(1)}% · PRESSURE {(prediction.probabilities[1] * 100).toFixed(1)}% · TRANSITION {(prediction.probabilities[2] * 100).toFixed(1)}%</p>
                  </div>
                )}
              </section>

              <section className="mw-analyst-block" aria-label="Evidence details">
                <h4 className="mw-analyst-section-title">Evidence from the sampled window</h4>
                <div className="mw-evidence">{insight.evidence.map((datum) => <span key={datum}>{datum}</span>)}</div>
                <div className="mw-analyst-detail"><strong>Traceable event IDs</strong><p>{insight.evidenceEventIds.join(", ") || "No events in this sample window"}</p></div>
              </section>

              <section className="mw-analyst-block" aria-label="Technical features">
                <h4 className="mw-analyst-section-title">Technical feature values</h4>
                <div className="mw-feature-grid">
                  {[["Completion", 0], ["Pressure", 1], ["Turnovers", 2], ["Shots", 3], ["Tempo", 4], ["Territory", 5], ["Tension", 6]].map(([label, index]) => (
                    <div className="mw-feature-chip" key={String(label)}>
                      <span>{label}</span><strong>{modelWindowFeatures.values[Number(index)].toFixed(2)}</strong>
                    </div>
                  ))}
                </div>
                <p className="mw-technical-note">Features describe the model sample, not the live replay clock. Model scores are outputs of a synthetic-trained model and are not calibrated real-world probabilities.</p>
              </section>

              <section className="mw-recap" aria-label="Automated event recap">
                <strong>Automated event recap · Live replay through {formatClock(replay.elapsedSeconds)}</strong><p>{recap}</p>
              </section>
            </div>
          )}

          <small className="mw-disclaimer">SYNTHETIC DATA NOTICE — This demonstration uses generated football events and synthetic training labels. It does not represent a real match or live Premier League data. Model confidence is not evidence of real-world predictive accuracy; the recap is generated from simulated events.</small>
        </section>

        <div className="mw-grid">
          <section className="mw-panel" aria-label="Match statistics">
            <div className="mw-section-title"><h2>Live Match Statistics</h2><span>AS OF {formatClock(replay.elapsedSeconds)}</span></div>
            <div className="mw-stat-head"><span>{match.metadata.homeTeam.abbreviation}</span><span>STATISTIC</span><span>{match.metadata.awayTeam.abbreviation}</span></div>
            <StatRow label="Possession" home={`${home.possessionPct}%`} away={`${away.possessionPct}%`} />
            <StatRow label="Total shots" home={home.shots} away={away.shots} />
            <StatRow label="Shots on target" home={home.shotsOnTarget} away={away.shotsOnTarget} />
            <StatRow label="Passes attempted" home={home.passesAttempted} away={away.passesAttempted} />
            <StatRow label="Completed passes" home={home.passesCompleted} away={away.passesCompleted} />
            <StatRow label="Pass accuracy" home={`${home.passCompletionPct}%`} away={`${away.passCompletionPct}%`} />
            <StatRow label="Tackles won" home={home.tacklesWon} away={away.tacklesWon} />
            <StatRow label="Defensive pressures" home={home.pressuresApplied} away={away.pressuresApplied} />
          </section>

          <section className="mw-panel" aria-label="Event feed">
            <div className="mw-section-title"><h2>Match Event Feed</h2><span>{frame.stats.processedEvents} / 1200</span></div>
            <div className="mw-feed">
              {frame.recentEvents.length === 0 ? <p className="mw-empty">No events yet.</p> : frame.recentEvents.slice().reverse().map((event) => (
                <div className="mw-event" key={event.id}>
                  <span className="mw-event-time">{formatClock(event.elapsedSeconds)}</span>
                  <div>
                    <strong>{describeEvent(event)}</strong>
                    <small>{event.teamId === match.metadata.homeTeam.id ? match.metadata.homeTeam.abbreviation : match.metadata.awayTeam.abbreviation} · {event.playerId}</small>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        <footer className="mw-footer">Matchwork • Synthetic demonstration data • No real match footage or live Premier League data</footer>
      </div>
    </main>
  );
}

export default App;
