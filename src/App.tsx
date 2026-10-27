
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
import LandingPage from "./LandingPage";
import {
  requestMatchInsight,
  type MatchEvidence,
  type MatchInsight,
} from "./services/matchworkAI";

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

function App() {
  const [page, setPage] = useState<"landing" | "studio">(
    () => window.location.hash.startsWith("#/studio") ? "studio" : "landing",
  );
  useEffect(() => {
    const onRouteChange = () => {
      setPage(window.location.hash.startsWith("#/studio") ? "studio" : "landing");
      window.scrollTo({ top: 0, behavior: "instant" });
    };
    window.addEventListener("hashchange", onRouteChange);
    return () => window.removeEventListener("hashchange", onRouteChange);
  }, []);
  const [replay, setReplay] = useState(() =>
    createReplayState(match),
  );

  const [audience, setAudience] = useState<AudienceMode>("fan");
  const [favoriteTeam, setFavoriteTeam] = useState<TeamId | "all">("all");
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null);
  const [dismissedEventId, setDismissedEventId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [insightTab, setInsightTab] = useState<"story" | "recap">("story");
  
const [aiResponse, setAiResponse] = useState<{
  key: string;
  result: MatchInsight;
} | null>(null);

const visibleKey =
  `${replay.elapsedSeconds}:${replay.status}:${audience}`;

const visibleAiInsight =
  aiResponse?.key === visibleKey
    ? aiResponse.result
    : null;
  const [modelStatus, setModelStatus] = useState<"loading" | "ready" | "unavailable">("loading");
  const [modelError, setModelError] = useState("");
  const insightWindow = Math.floor(replay.elapsedSeconds / 15);
  const modelSampleTime = insightWindow * 15;
  const [predictionSample, setPredictionSample] = useState<number | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    let current = true;
    const clock = Math.min(match.metadata.durationSeconds, insightWindow * 15);
    predictMatchState(extractWindowFeatures(match, clock))
      .then((result) => {
        if (!current) return;
        setPrediction(result);
        setPredictionSample(clock);
        setModelStatus("ready");
        setModelError("");
      })
      .catch((error: unknown) => {
        if (!current) return;
        setPrediction(null);
        setPredictionSample(null);
        setModelStatus("unavailable");
        setModelError(error instanceof Error ? error.message : "Model could not be loaded");
      });
    return () => { current = false; };
  }, [insightWindow, retryCount]);

  const windowFeatures = extractWindowFeatures(match, replay.elapsedSeconds);
  const insight = explainMatchState(windowFeatures, modelStatus === "ready" && predictionSample === modelSampleTime ? prediction : null, audience, favoriteTeam, match);
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
    
  
useEffect(() => {
  // Generate Foundry explanations only when paused
  // or when the replay has finished.
  if (replay.status === "playing") return;

  const controller = new AbortController();

  const currentFrame = getReplayFrame(match, replay);
  const event = currentFrame.latestEvent;

  if (!event) return;

  const features = extractWindowFeatures(
    match,
    replay.elapsedSeconds
  );

  // Identifies the state this request belongs to.
  const requestKey =
    `${replay.elapsedSeconds}:${replay.status}:${audience}`;

  const eventEvidence: MatchEvidence = {
    minute: replay.elapsedSeconds / 60,
    event_type: event.type,
    team:
      event.teamId === match.metadata.homeTeam.id
        ? match.metadata.homeTeam.name
        : match.metadata.awayTeam.name,
    description:
      `Latest event: ${describeEvent(event)}. ` +
      `Rolling three-minute window: ` +
      `${features.passesCompleted} of ` +
      `${features.passesAttempted} passes completed, ` +
      `${features.shots} shots, ` +
      `${features.pressures} pressures, ` +
      `${features.turnovers} possession changes.`,
    score:
      `${currentFrame.stats.home.goals}-` +
      `${currentFrame.stats.away.goals}`,
    evidence_ids: features.eventIds.slice(-5),
    statistics: {
      passes_attempted: features.passesAttempted,
      passes_completed: features.passesCompleted,
      shots: features.shots,
      pressures: features.pressures,
      turnovers: features.turnovers
    }
  };

  const fallbackText = buildMatchRecap(
    match,
    replay.elapsedSeconds
  );

  const timer = window.setTimeout(() => {
    requestMatchInsight(
      eventEvidence,
      fallbackText,
      audience,
      controller.signal
    )
      .then((result) => {
        if (controller.signal.aborted) return;

        setAiResponse({
          key: requestKey,
          result
        });
      })
      .catch((error: unknown) => {
        if (controller.signal.aborted) return;

        console.error(
          "Microsoft Foundry unavailable:",
          error
        );

        setAiResponse({
          key: requestKey,
          result: {
            source: "rule-based",
            explanation: fallbackText,
            evidence_ids: eventEvidence.evidence_ids,
            status: "ai_unavailable"
          }
        });
      });
  }, 600);

  return () => {
    window.clearTimeout(timer);
    controller.abort();
  };
}, [replay, audience]);

  const isAnalyst = audience === "analyst";
  const homeTeam = match.metadata.homeTeam;
  const awayTeam = match.metadata.awayTeam;
  const visibleModel = modelStatus === "ready" && predictionSample === modelSampleTime;
  const modelDisplayStatus = visibleModel ? "ready" : modelStatus === "unavailable" ? "unavailable" : "loading";
  const latestMoment = frame.latestEvent;
  const showMoment = latestMoment && dismissedEventId !== latestMoment.id;
  const eventLabel = (event: MatchEvent) =>
    event.teamId === homeTeam.id ? homeTeam.abbreviation : awayTeam.abbreviation;
  const possessionTotal = Math.max(1, home.possessionPct + away.possessionPct);
  const homeShare = Math.round((home.possessionPct / possessionTotal) * 100);
  const visibleEvents = frame.recentEvents.slice().reverse();
  const onSeek = (time: number) => setReplay((current) => seekReplay(current, match, time));

  if (page === "landing") return <LandingPage match={match} />;

  return (
    <main className={`mw-app ${isAnalyst ? "mw-analyst" : "mw-fan"}`}>
      <div className="mw-ambient mw-ambient-one" aria-hidden="true" />
      <div className="mw-ambient mw-ambient-two" aria-hidden="true" />
      <div className="mw-shell">
        <header className="mw-topbar">
          <a className="mw-brand" href="#/" aria-label="Matchwork, back to home">
            <span className="mw-brand-icon" aria-hidden="true"><span /></span>
            <span className="mw-brand-word">MATCHWORK<span className="mw-brand-period">.</span></span>
          </a>
          <div className="mw-topnav" aria-label="Dashboard sections">
            <a href="#/">Home</a>
            <a href="#insights">Insights</a>
            <a href="#numbers">Statistics</a>
          </div>
          <div className="mw-nav-end"><span className="mw-live-dot" aria-hidden="true" /><span>DEMO REPLAY</span><span className="mw-top-divider" /><span className="mw-demo-tag">SYNTHETIC DATA</span></div>
        </header>

        <div className="mw-content" id="match">
          <div className="mw-pagehead mw-reveal">
            <div>
              
              <h1>{isAnalyst ? "Analysis desk" : "Match center"}</h1>
              <p>{isAnalyst ? "Evidence, timelines and match analysis." : "Follow the match your way."}</p>
            </div>
            <div className="mw-mode-switch" role="group" aria-label="Choose viewing experience">
              <button type="button" className={!isAnalyst ? "mw-mode-active" : ""} aria-pressed={!isAnalyst} onClick={() => setAudience("fan")}><span aria-hidden="true">◉</span> Fan view</button>
              <button type="button" className={isAnalyst ? "mw-mode-active" : ""} aria-pressed={isAnalyst} onClick={() => setAudience("analyst")}><span aria-hidden="true">▥</span> Analyst view</button>
            </div>
          </div>

          <section className="mw-match-panel mw-reveal" aria-label="Match scoreboard and replay">
            <div className="mw-match-top">
              <span><span className="mw-live-dot" aria-hidden="true" /> MATCH REPLAY <span className="mw-separator">/</span> {match.metadata.title}</span>
              <span className="mw-match-state">{replay.status === "finished" ? "FULL TIME" : isPlaying ? "● PLAYING" : "Ⅱ PAUSED"}</span>
            </div>
            <div className="mw-scoreboard">
              <div className="mw-team mw-team-home"><div className="mw-crest mw-crest-home"><span>{homeTeam.abbreviation.slice(0,1)}</span></div><span className="mw-team-abbr">{homeTeam.abbreviation}</span><h2>{homeTeam.name}</h2><small>HOME</small></div>
              <div className="mw-score-center"><div className="mw-score" aria-label={`${homeTeam.name} ${home.goals}, ${awayTeam.name} ${away.goals}`}><span key={home.goals}>{home.goals}</span><b>:</b><span key={away.goals}>{away.goals}</span></div><div className="mw-score-time"><span className="mw-clock-dot" aria-hidden="true" /> {formatClock(replay.elapsedSeconds)} <span>/ {formatClock(match.metadata.durationSeconds)}</span></div><span className="mw-match-round">DEMO MATCH</span></div>
              <div className="mw-team mw-team-away"><div className="mw-crest mw-crest-away"><span>{awayTeam.abbreviation.slice(0,1)}</span></div><span className="mw-team-abbr">{awayTeam.abbreviation}</span><h2>{awayTeam.name}</h2><small>AWAY</small></div>
            </div>

            <div className="mw-replay-console">
              <div className="mw-console-top"><span>THE MATCH TIMELINE</span><span className="mw-progress-percent">{Math.round(100 * replay.elapsedSeconds / match.metadata.durationSeconds)}% COMPLETE</span></div>
              <div className="mw-range-shell">
                <input id="match-progress" className="mw-slider" type="range" min={0} max={match.metadata.durationSeconds} step={1} value={replay.elapsedSeconds} aria-label="Seek match replay time" aria-valuetext={formatClock(replay.elapsedSeconds)} style={{background:`linear-gradient(90deg,#b8fa71 ${100 * replay.elapsedSeconds / match.metadata.durationSeconds}%,#34433b 0%)`}} onChange={(event) => onSeek(Number(event.target.value))} />
              </div>
              <div className="mw-time-marks"><span>00:00 / KICK OFF</span><span>45:00 / HALF TIME</span><span>90:00 / FULL TIME</span></div>
              <div className="mw-control-row">
                <div className="mw-play-controls">
                  <button className="mw-play" type="button" disabled={replay.status === "finished"} aria-label={isPlaying ? "Pause match replay" : "Play match replay"} onClick={() => setReplay((current) => isPlaying ? pauseReplay(current) : playReplay(current, match))}><span aria-hidden="true">{isPlaying ? "Ⅱ" : "▶"}</span> {isPlaying ? "Pause replay" : "Play replay"}</button>
                  <button className="mw-icon-button" type="button" aria-label="Restart match replay" title="Restart match replay" onClick={() => {setReplay((current) => restartReplay(current));setDismissedEventId(null);}}>↺</button>
                  <span className="mw-control-divider" />
                  <label className="mw-speed-label" htmlFor="replay-speed">SPEED <select id="replay-speed" value={replay.speed} onChange={(event) => setReplay((current) => setReplaySpeed(current, Number(event.target.value)))}><option value={1}>1×</option><option value={4}>4×</option><option value={16}>16×</option></select></label>
                </div>
                <span className="mw-console-note">{isPlaying ? "The story unfolds in real time" : "Drag the timeline to explore any moment"}</span>
              </div>
            </div>
          </section>

          <div className="mw-main-grid" id="insights">
            <div className="mw-main-column">
              <section className="mw-panel mw-intelligence mw-reveal" aria-label="Match intelligence">
                <div className="mw-panel-heading"><div><span className="mw-panel-kicker">{isAnalyst ? "ANALYSIS DESK" : "YOUR MATCH STORY"}</span><h2>{isAnalyst ? "Match intelligence" : "What's happening?"}</h2></div><span className="mw-spark-symbol" aria-hidden="true">✳</span></div>
                <div className="mw-insight-focus"><label htmlFor="focus-team">{isAnalyst ? "ANALYSIS TARGET" : "FOLLOW A TEAM"}</label><select id="focus-team" value={favoriteTeam} onChange={(event) => setFavoriteTeam(event.target.value as TeamId | "all")}><option value="all">Both teams</option><option value={homeTeam.id}>{homeTeam.name}</option><option value={awayTeam.id}>{awayTeam.name}</option></select></div>
                {isAnalyst ? (
                  <>
                    <div className="mw-status-line"><span className={`mw-status-indicator mw-status-${modelDisplayStatus}`} /><span>{modelDisplayStatus === "ready" ? "ONNX inference available" : modelDisplayStatus === "loading" ? "ONNX inference pending" : "ONNX inference unavailable"}</span><span className="mw-status-detail">SYNTHETIC MODEL</span></div>
                    <div className="mw-technical-times"><div><small>LIVE REPLAY TIME</small><strong>{formatClock(replay.elapsedSeconds)}</strong></div><div><small>MODEL SAMPLE AS OF</small><strong>{formatClock(modelSampleTime)}</strong></div><div><small>FEATURE WINDOW</small><strong>180s rolling</strong></div></div>
                  </>
                ) : <div className="mw-story-meta"><span className="mw-story-pulse" aria-hidden="true" /><span>{modelDisplayStatus === "ready" ? "MATCH MOMENT" : "LIVE MATCH EVENTS"}</span><span className="mw-story-meta-time">{formatClock(replay.elapsedSeconds)}</span></div>}
                <div className="mw-headline-block" key={insight.headline}><h3>{!isAnalyst && modelDisplayStatus !== "ready" ? latestMoment ? describeEvent(latestMoment) : "The match is about to begin" : insight.headline}</h3><p>{!isAnalyst && modelDisplayStatus !== "ready" ? latestMoment ? `${eventLabel(latestMoment)} are part of the latest action. Keep watching to see how the match develops.` : "Press play to follow every pass, challenge, and change in momentum." : insight.narrative}</p></div>
                <div className="mw-why"><span className="mw-why-icon" aria-hidden="true">↗</span><div><strong>{isAnalyst ? "INTERPRETATION" : "WHY IT MATTERS"}</strong><p>{isAnalyst ? insight.whyItMatters : modelDisplayStatus === "ready" ? insight.whyItMatters : "Every update comes from events already shown in the replay."}</p></div></div>
                {isAnalyst && <>
                  <div className="mw-model-readout"><div className="mw-readout-label">CLASSIFIER OUTPUT <small>NOT CALIBRATED PROBABILITIES</small></div>{visibleModel && prediction ? (["CONTROL","PRESSURE","TRANSITION"] as const).map((label,index)=><div className="mw-probability" key={label}><div><span>{label}</span><strong>{(prediction.probabilities[index]*100).toFixed(1)}%</strong></div><div className="mw-prob-track"><span style={{width:`${prediction.probabilities[index]*100}%`}} /></div></div>) : <p className="mw-muted-note">No validated ONNX result for this replay sample.</p>}</div>
                  <details className="mw-evidence-details" open={detailsOpen} onToggle={(event)=>setDetailsOpen(event.currentTarget.open)}><summary>EVENT EVIDENCE &amp; MODEL DETAILS <span>↗</span></summary><div className="mw-evidence-list">{insight.evidence.map((datum)=><span key={datum}>{datum}</span>)}</div><div className="mw-evidence-ids"><strong>OBSERVED EVENT IDS</strong><p>{insight.evidenceEventIds.join(" · ") || "No events in this window"}</p></div><div className="mw-model-footer">Engine: Microsoft ONNX Runtime Web / WASM · Training: synthetic prototypes · Sample: 15s boundaries</div></details>
                  {modelDisplayStatus === "unavailable" && <div className="mw-technical-error"><p>ONNX unavailable: {modelError}</p><button type="button" onClick={()=>setRetryCount((n)=>n+1)}>Retry classifier ↻</button></div>}
                </>}
                {!isAnalyst && <div className="mw-story-actions"><button type="button" className={insightTab==="story"?"mw-tab-selected":""} onClick={()=>setInsightTab("story")} aria-pressed={insightTab==="story"}>Match story</button><button type="button" className={insightTab==="recap"?"mw-tab-selected":""} onClick={()=>setInsightTab("recap")} aria-pressed={insightTab==="recap"}>Quick recap</button></div>}
                {isAnalyst || insightTab==="recap" ? <div className="mw-narrative-box"><div><strong>{isAnalyst ? "GENERATED EXPLANATION" : "THE STORY SO FAR"}</strong>{isAnalyst && <span className="mw-source-pill">{visibleAiInsight?.source==="foundry"?"FOUNDRY": "RULE BASED"}</span>}</div><p>{isAnalyst ? visibleAiInsight?.explanation ?? (replay.status==="playing"?"Pause replay to request Foundry explanation.":recap) : recap}</p>{isAnalyst && <small>{visibleAiInsight?.source==="foundry"?"Microsoft Foundry response · backed by submitted observed event IDs":visibleAiInsight?.source==="rule-based"?"Foundry unavailable · deterministic fallback":"Only events up to the replay clock are used"}</small>}</div> : <div className="mw-narrative-box"><strong>THE MOMENT</strong><p>{visibleAiInsight?.explanation ?? (latestMoment ? describeEvent(latestMoment) : "Start the replay to discover the biggest moments.")}</p><small>{replay.status==="playing"?"Pause on a moment for a deeper match story":visibleAiInsight?.source==="foundry"?"Expanded story ready":"Showing the match story from observed events"}</small></div>}
              </section>

              {latestMoment && showMoment && <aside className="mw-moment-banner mw-reveal" aria-label="Latest match moment"><div className="mw-moment-mark" aria-hidden="true">↗</div><div className="mw-moment-copy"><small>LATEST MATCH MOMENT · {formatClock(latestMoment.elapsedSeconds)}</small><strong>{describeEvent(latestMoment)}</strong><span>{eventLabel(latestMoment)} / {isAnalyst ? `Event ${latestMoment.id} / ${latestMoment.playerId}` : "Action from the pitch"}</span></div><button className="mw-moment-dismiss" type="button" onClick={()=>setDismissedEventId(latestMoment.id)} aria-label="Dismiss match moment">×</button></aside>}
            </div>

            <div className="mw-side-column">
              <section className="mw-panel mw-pitch-panel mw-reveal" aria-label="Observed event location on pitch"><div className="mw-panel-heading"><div><span className="mw-panel-kicker">FROM THE PITCH</span><h2>{isAnalyst ? "Observed event position" : "Where the action is"}</h2></div><span className="mw-panel-icon" aria-hidden="true">⌖</span></div>
                <div className="mw-pitch-shell"><svg viewBox="0 0 320 206" role="img" aria-label={latestMoment ? `Latest observed event location, ${Math.round(latestMoment.x)} percent along and ${Math.round(latestMoment.y)} percent across the pitch` : "Pitch visualization awaiting the first event"}>
                  <rect x="1" y="1" width="318" height="204" rx="7" fill="#112c27" stroke="#51786d" strokeWidth="1.5" />
                  <g stroke="#51786d" strokeWidth="1.3" fill="none"><path d="M160 1V205 M1 1H319V205H1Z"/><circle cx="160" cy="103" r="29"/><circle cx="160" cy="103" r="2" fill="#51786d"/><path d="M1 45H51V161H1 M319 45H269V161H319 M1 77H20V129H1 M319 77H300V129H319"/><path d="M63 72A34 34 0 0 1 63 134 M257 72A34 34 0 0 0 257 134"/></g>
                  {frame.recentEvents.slice(-5).map((event,index)=><circle key={event.id} cx={10+event.x*3} cy={10+event.y*1.86} r={index===Math.min(5,frame.recentEvents.length)-1 ? 8 : 4} fill={event.teamId===homeTeam.id?"#75b4ff":"#ff877e"} opacity={index===Math.min(5,frame.recentEvents.length)-1 ? 1 : 0.38} stroke="#eaf4f2" strokeWidth={index===Math.min(5,frame.recentEvents.length)-1?2:0}/>)}
                </svg><div className="mw-pitch-overlay"><span className="mw-live-dot" /> EVENT COORDINATES / SYNTHETIC</div></div>
                <div className="mw-pitch-legend"><span><i className="mw-legend-dot mw-legend-home" />{homeTeam.abbreviation}</span><span><i className="mw-legend-dot mw-legend-away" />{awayTeam.abbreviation}</span></div>
                <p className="mw-pitch-footnote">{latestMoment ? `${formatClock(latestMoment.elapsedSeconds)} · ${describeEvent(latestMoment)}` : "Start the replay to see where recorded match events occur."}</p>
              </section>

              <section className="mw-panel mw-feed-panel mw-reveal" aria-label="Recent match events"><div className="mw-panel-heading"><div><span className="mw-panel-kicker">PLAY BY PLAY</span><h2>{isAnalyst?"Observed event stream":"Latest action"}</h2></div><span className="mw-feed-count">{frame.stats.processedEvents} EVENTS</span></div><div className="mw-feed">{visibleEvents.length===0?<p className="mw-empty">The opening whistle is coming. Press play to begin.</p>:visibleEvents.map((event,index)=><div className="mw-event" key={event.id}><div className="mw-event-rail"><span className={`mw-event-symbol mw-event-${event.type}`}>{event.type==="shot"?"◎":event.type==="pass"?"↗":event.type==="tackle"?"✕":event.type==="pressure"?"≋":"↔"}</span>{index<visibleEvents.length-1&&<span className="mw-event-link"/>}</div><div className="mw-event-detail"><div><strong>{describeEvent(event)}</strong><time>{formatClock(event.elapsedSeconds)}</time></div><small>{eventLabel(event)} · {isAnalyst?`${event.playerId} · ${event.id}`:"Match event"}</small></div></div>)}</div></section>
            </div>
          </div>

          <section className="mw-panel mw-stats-panel mw-reveal" id="numbers" aria-label="Match statistics"><div className="mw-panel-heading"><div><span className="mw-panel-kicker">MATCH STATS</span><h2>{isAnalyst?"Live match statistics":"Match at a glance"}</h2></div><span className="mw-section-time">{formatClock(replay.elapsedSeconds)}</span></div>
            <div className="mw-possession"><div className="mw-possession-heading"><span><i className="mw-legend-dot mw-legend-home" />{homeTeam.abbreviation} <strong>{home.possessionPct}%</strong></span><span>POSSESSION</span><span><strong>{away.possessionPct}%</strong> {awayTeam.abbreviation}<i className="mw-legend-dot mw-legend-away" /></span></div><div className="mw-possession-track"><span style={{width:`${homeShare}%`}} /></div></div>
            <div className="mw-stat-grid">{([{label:"Shots",left:home.shots,right:away.shots},{label:"Shots on target",left:home.shotsOnTarget,right:away.shotsOnTarget},{label:"Pass accuracy",left:`${home.passCompletionPct}%`,right:`${away.passCompletionPct}%`},{label:"Tackles won",left:home.tacklesWon,right:away.tacklesWon},...(isAnalyst?[{label:"Pass attempts",left:home.passesAttempted,right:away.passesAttempted},{label:"Completed passes",left:home.passesCompleted,right:away.passesCompleted},{label:"Defensive pressures",left:home.pressuresApplied,right:away.pressuresApplied}]:[])]).map((stat)=><div className="mw-stat" key={stat.label}><strong>{stat.left}</strong><span>{stat.label}</span><strong>{stat.right}</strong></div>)}</div>
          </section>
          <footer className="mw-footer"><span>© MATCHWORK / THE GAME, UNDERSTOOD.</span><span>Synthetic football events and training labels · Not live Premier League data or real-world model accuracy</span></footer>
        </div>
      </div>
    </main>
  );
}

export default App;
