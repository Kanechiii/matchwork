
import { useEffect, useMemo, useState, type CSSProperties, type PointerEvent as ReactPointerEvent, type ReactNode } from "react";
import { AnimatePresence, MotionConfig, motion } from "motion/react";
import { Activity, BookOpen, ChartColumn, ChartColumnBig, ChartSpline, ChevronDown, CircleAlert, Info, ListChecks, Pause, Play, RefreshCw, RotateCcw, SlidersHorizontal, Users, X } from "lucide-react";
import type { MatchEvent } from "./types/match";
import { demoMatch } from "./data/demoMatch";
import { generateSyntheticMatch } from "./engine/generateEvents";
import {
  advanceReplay,
  REPLAY_SPEEDS,
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
import { leagueFixtures, leagueTeams } from "./data/league";
import { calculatePlayerStats, aggregatePlayerStats } from "./engine/calculatePlayerStats";
import { calculateMatchStats } from "./engine/calculateStats";
import { Brand } from "./components/Brand";
import { ThemeToggle } from "./components/ThemeToggle";
import { EventIcon } from "./components/EventIcon";
import { Segmented } from "./components/Segmented";
import { TeamCrest } from "./components/TeamCrest";
import { EASE_IN, EASE_OUT, SPRING_BAR, SPRING_UI, swap } from "./motion";
import {
  requestMatchInsight,
  requestPublicMatchInsight,
  startOperatorSession,
  hasOperatorSession,
  type MatchInsight,
} from "./services/matchworkAI";
import { buildRoster, describeEvent, formatClock } from "./studio/format";
import { FixturePicker, FixtureStrip } from "./studio/Fixtures";
import { TeamFollow } from "./studio/TeamFollow";
import { ActionPitch } from "./studio/ActionPitch";
import { CompareColumns, MomentumChart, TrendChart, type MomentumBucket, type TrendPoint } from "./studio/StatCharts";
import { PlayerBoard } from "./studio/PlayerBoard";
import { buildStatTimeline, PERIOD_SECONDS, STAT_METRICS, TIMELINE_STEP, ZERO_TEAM_STATS } from "./studio/statSeries";
import "./studio/studio.css";

// Generated once, outside React rendering.
const match = generateSyntheticMatch(demoMatch);

function MatchStudio({ match, selectedFixture, onSelectFixture }: { match: typeof leagueFixtures[number]["match"]; selectedFixture: string; onSelectFixture: (id: string) => void }) {
  const [replay, setReplay] = useState(() =>
    createReplayState(match),
  );

  const [audience, setAudience] = useState<AudienceMode>("fan");
  const [favoriteTeam, setFavoriteTeam] = useState<TeamId | "all">("all");
  const [prediction, setPrediction] = useState<MatchPrediction | null>(null);
  const [dismissedEventId, setDismissedEventId] = useState<string | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(true);
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null);
  const [playerView, setPlayerView] = useState<"replay" | "season">("replay");
  // Presentation-only state for the enhanced dashboard.
  const [playerTeam, setPlayerTeam] = useState<TeamId | "all">("all");
  const [statView, setStatView] = useState<"compare" | "columns" | "trend" | "momentum">("compare");
  const [statMetric, setStatMetric] = useState("shots");
  const [pitchMode, setPitchMode] = useState<"recent" | "window">("recent");
  const roster = useMemo(() => buildRoster(match), [match]);
  const statTimeline = useMemo(() => buildStatTimeline(match), [match]);
  
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
  const [operatorCode, setOperatorCode] = useState("");
  const [operatorReady, setOperatorReady] = useState(hasOperatorSession);
  const [operatorError, setOperatorError] = useState("");
  const [operatorBusy, setOperatorBusy] = useState(false);
  const [publicAiBusy, setPublicAiBusy] = useState(false);
  const [publicAiNotice, setPublicAiNotice] = useState("");
  const enableOperatorAI = async () => {
    if (operatorBusy || !operatorCode) return;
    setOperatorBusy(true);
    setOperatorError("");
    try {
      await startOperatorSession(operatorCode);
      setOperatorReady(true);
      setOperatorCode("");
    } catch (error) {
      setOperatorError(error instanceof Error ? error.message : "Operator access unavailable");
    } finally {
      setOperatorBusy(false);
    }
  };
  const insightWindow = Math.floor(replay.elapsedSeconds / 15);
  const modelSampleTime = insightWindow * 15;
  const [retryCount, setRetryCount] = useState(0);

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
  }, [insightWindow, retryCount]);

  // The sampled classifier and live replay are separate clocks. Keep event
  // statistics/recaps live, but classify only the sampled feature window.
  const sampleFeatures = extractWindowFeatures(match, modelSampleTime);
  const validPrediction =
    modelStatus === "ready" && prediction?.asOfSeconds === modelSampleTime
      ? prediction
      : null;
  const insight = explainMatchState(sampleFeatures, validPrediction, audience, favoriteTeam, match);
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

  const generatePublicNarrative = async () => {
    if (publicAiBusy || match.metadata.id !== demoMatch.id || replay.status === "playing" || !frame.latestEvent) return;
    setPublicAiBusy(true);
    setPublicAiNotice("");
    const key = `${replay.elapsedSeconds}:${replay.status}:${audience}`;
    try {
      const result = await requestPublicMatchInsight({
        match_id: "matchwork-demo-001",
        as_of_seconds: replay.elapsedSeconds,
        audience,
      });
      setAiResponse({ key, result });
      if (result.source !== "foundry") {
        setPublicAiNotice(`AI preview is unavailable (${result.status}). Replay and evidence-based recaps remain accessible.`);
      }
    } catch (error) {
      setPublicAiNotice(error instanceof Error ? error.message : "AI preview could not be reached");
    } finally {
      setPublicAiBusy(false);
    }
  };

  const isPlaying = replay.status === "playing";
    
  
useEffect(() => {
  // Generate Foundry explanations only when paused
  // or when the replay has finished.
  if (replay.status === "playing") return;

  const controller = new AbortController();

  const currentFrame = getReplayFrame(match, replay);
  const event = currentFrame.latestEvent;

  if (!event || match.metadata.id !== demoMatch.id || !operatorReady) return;

  const features = extractWindowFeatures(
    match,
    replay.elapsedSeconds
  );

  // Identifies the state this request belongs to.
  const requestKey =
    `${replay.elapsedSeconds}:${replay.status}:${audience}`;

  const eventEvidence = {
    match_id: demoMatch.id as "matchwork-demo-001",
    as_of_seconds: replay.elapsedSeconds,
    evidence_ids: features.eventIds.slice(-5),
    audience,
  };

  const fallbackText = buildMatchRecap(
    match,
    replay.elapsedSeconds
  );

  const timer = window.setTimeout(() => {
    requestMatchInsight(
      eventEvidence,
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
}, [replay, audience, match, operatorReady]);

  const isAnalyst = audience === "analyst";
  const homeTeam = match.metadata.homeTeam;
  const awayTeam = match.metadata.awayTeam;
  const visibleModel = validPrediction !== null;
  const modelDisplayStatus = visibleModel ? "ready" : modelStatus === "unavailable" ? "unavailable" : "loading";
  const latestMoment = frame.latestEvent;
  const showMoment = latestMoment && dismissedEventId !== latestMoment.id;
  const eventLabel = (event: MatchEvent) =>
    event.teamId === homeTeam.id ? homeTeam.abbreviation : awayTeam.abbreviation;
  const possessionTotal = Math.max(1, home.possessionPct + away.possessionPct);
  const homeShare = Math.round((home.possessionPct / possessionTotal) * 100);
  const visibleEvents = frame.recentEvents.slice().reverse();
  const onSeek = (time: number) => setReplay((current) => seekReplay(current, match, time));

  const playerStats = calculatePlayerStats(match, replay.elapsedSeconds);
  const leagueStats = aggregatePlayerStats(leagueFixtures.map(f => f.match));
  const sourcePlayers = playerView === "replay" ? playerStats : leagueStats;
  // Following a team also filters the player board; the board's own team filter can override it.
  const followTeam = (team: TeamId | "all") => { setFavoriteTeam(team); setPlayerTeam(team); };

  // ---- Presentation layer. Everything above this line is the unchanged replay and insight logic. ----
  const durationSeconds = match.metadata.durationSeconds;
  const progressPct = (100 * replay.elapsedSeconds) / durationSeconds;
  const statusLabel = replay.status === "finished" ? "Full time" : isPlaying ? "Playing" : "Paused";
  const fanFallback = !isAnalyst && modelDisplayStatus !== "ready";
  const headline = fanFallback
    ? latestMoment ? describeEvent(latestMoment) : "The match is about to begin"
    : insight.headline;
  const narrative = fanFallback
    ? latestMoment
      ? `${eventLabel(latestMoment)} are part of the latest action. Keep watching to see how the match develops.`
      : "Press play to follow every pass, challenge, and change in momentum."
    : insight.narrative;
  const whyText = isAnalyst
    ? insight.whyItMatters
    : modelDisplayStatus === "ready" ? insight.whyItMatters : "Every update comes from events already shown in the replay.";
  const sourceLabel = visibleAiInsight?.source === "foundry" ? "Microsoft Foundry" : visibleAiInsight?.source === "rule-based" ? "Rule based" : "Pending";
  const shotMarks = match.events.filter(
    (event): event is Extract<MatchEvent, { type: "shot" }> => event.type === "shot" && event.elapsedSeconds <= replay.elapsedSeconds,
  );
  const topProbability = visibleModel && prediction ? Math.max(...prediction.probabilities) : null;
  const statRows: { label: string; left: number; right: number; unit?: string }[] = [
    { label: "Shots", left: home.shots, right: away.shots },
    { label: "Shots on target", left: home.shotsOnTarget, right: away.shotsOnTarget },
    { label: "Pass accuracy", left: Math.round(home.passCompletionPct), right: Math.round(away.passCompletionPct), unit: "%" },
    { label: "Tackles won", left: home.tacklesWon, right: away.tacklesWon },
    ...(isAnalyst ? [
      { label: "Pass attempts", left: home.passesAttempted, right: away.passesAttempted },
      { label: "Completed passes", left: home.passesCompleted, right: away.passesCompleted },
      { label: "Defensive pressures", left: home.pressuresApplied, right: away.pressuresApplied },
    ] : []),
  ];
  const scrollTo = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  // Story and recap panels. The fan story avoids repeating the recap when the
  // explanation is the deterministic fallback (which is the recap text itself).
  const momentActor = latestMoment ? roster.get(latestMoment.playerId) : undefined;
  const momentStory = latestMoment
    ? `${describeEvent(latestMoment)} at ${formatClock(latestMoment.elapsedSeconds)}${momentActor ? `, involving ${momentActor.player.name} (#${momentActor.player.shirtNumber}) of ${momentActor.team.name}` : ""}.`
    : "Start the replay to discover the biggest moments.";
  const aiStory = visibleAiInsight?.source === "foundry" && visibleAiInsight.explanation !== recap ? visibleAiInsight.explanation : null;
  const storyText = isAnalyst
    ? visibleAiInsight?.explanation ?? (replay.status === "playing" ? "Pause replay to request Foundry explanation." : recap)
    : aiStory ?? momentStory;
  const storyNote = isAnalyst
    ? visibleAiInsight?.source === "foundry" ? "Microsoft Foundry response · backed by submitted observed event IDs" : visibleAiInsight?.source === "rule-based" ? "Foundry unavailable · deterministic fallback" : "Only events up to the replay clock are used"
    : replay.status === "playing" ? "Pause on a moment for a deeper match story" : visibleAiInsight?.source === "foundry" ? "Expanded story ready" : "Showing the match story from observed events";
  const possessionWins = match.events.filter((event) => event.type === "possession_change" && event.elapsedSeconds <= replay.elapsedSeconds);
  const recapTiles = [
    { label: "Goals", home: home.goals, away: away.goals },
    { label: "Shots", home: home.shots, away: away.shots },
    { label: "Pressures", home: home.pressuresApplied, away: away.pressuresApplied },
    { label: "Possession changes", home: possessionWins.filter((e) => e.teamId === homeTeam.id).length, away: possessionWins.filter((e) => e.teamId === awayTeam.id).length },
  ];

  // Pitch: the latest five events, or every event in the model's 180s feature window.
  const pitchWindowStart = Math.max(0, replay.elapsedSeconds - 180);
  const pitchEvents = pitchMode === "recent"
    ? frame.recentEvents.slice(-5)
    : match.events.filter((event) => event.elapsedSeconds >= pitchWindowStart && event.elapsedSeconds <= replay.elapsedSeconds);

  // Statistic charts read the same engine snapshots as the live panel.
  const statsAt = (t: number) => t === replay.elapsedSeconds ? frame.stats : statTimeline.get(t) ?? calculateMatchStats(match, t);
  const metricOptions = STAT_METRICS.filter((metric) => isAnalyst || !metric.analystOnly);
  const activeMetric = metricOptions.find((metric) => metric.key === statMetric) ?? metricOptions[0];
  const trendPoints: TrendPoint[] = [];
  for (let t = activeMetric.unit === "%" ? TIMELINE_STEP : 0; t < replay.elapsedSeconds; t += TIMELINE_STEP) {
    const snapshot = statsAt(t);
    trendPoints.push({ t, home: activeMetric.total(snapshot.home), away: activeMetric.total(snapshot.away) });
  }
  if (replay.elapsedSeconds > 0 || activeMetric.unit !== "%") {
    trendPoints.push({ t: replay.elapsedSeconds, home: activeMetric.total(home), away: activeMetric.total(away) });
  }
  const momentumBuckets: MomentumBucket[] = Array.from({ length: Math.ceil(durationSeconds / PERIOD_SECONDS) }, (_, i) => {
    const start = i * PERIOD_SECONDS;
    const end = Math.min(durationSeconds, start + PERIOD_SECONDS);
    const label = `${start / 60}–${Math.round(end / 60)}'`;
    if (replay.elapsedSeconds <= start) return { label, home: null, away: null, live: false };
    const until = Math.min(end, replay.elapsedSeconds);
    const from = start === 0 ? { home: ZERO_TEAM_STATS, away: ZERO_TEAM_STATS } : statsAt(start), to = statsAt(until);
    return { label, home: activeMetric.period(to.home, from.home, until - start), away: activeMetric.period(to.away, from.away, until - start), live: replay.elapsedSeconds < end };
  });
  const goalMarks = shotMarks.filter((shot) => shot.outcome === "goal").map((shot) => ({ id: shot.id, t: shot.elapsedSeconds, side: shot.teamId === homeTeam.id ? "home" as const : "away" as const }));
  const boardTeams = playerView === "replay" ? [homeTeam, awayTeam] : [homeTeam, awayTeam, ...leagueTeams.filter((team) => team.id !== homeTeam.id && team.id !== awayTeam.id)];

  // Timeline hover preview.
  const [hover, setHover] = useState<{ ratio: number; time: number } | null>(null);
  const onTimelineHover = (event: ReactPointerEvent<HTMLDivElement>) => {
    const rect = event.currentTarget.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (event.clientX - rect.left - 9) / Math.max(1, rect.width - 18)));
    setHover({ ratio, time: Math.round(ratio * durationSeconds) });
  };

  // Brief goal announcement when the score goes up (playing or seeking forward).
  const [goalFlash, setGoalFlash] = useState<{ id: string; team: string; time: number; side: "home" | "away" } | null>(null);
  const goalTotal = home.goals + away.goals;
  const latestGoal = shotMarks.filter((shot) => shot.outcome === "goal").at(-1) ?? null;
  const [goalsSeen, setGoalsSeen] = useState(goalTotal);
  if (goalTotal !== goalsSeen) {
    setGoalsSeen(goalTotal);
    const side = latestGoal?.teamId === homeTeam.id ? "home" : "away";
    setGoalFlash(goalTotal > goalsSeen && latestGoal
      ? { id: latestGoal.id, team: side === "home" ? homeTeam.name : awayTeam.name, time: latestGoal.elapsedSeconds, side }
      : null);
  }
  useEffect(() => {
    if (!goalFlash) return;
    const timer = window.setTimeout(() => setGoalFlash(null), 3200);
    return () => window.clearTimeout(timer);
  }, [goalFlash]);

  // Presenter shortcuts: Space plays or pauses, arrow keys step 15 seconds.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, select, textarea, button, a, summary, [contenteditable], [role='button'], [role='listbox'], [role='dialog']")) return;
      if (event.code === "Space") {
        event.preventDefault();
        setReplay((current) => current.status === "playing" ? pauseReplay(current) : current.status === "finished" ? current : playReplay(current, match));
      } else if (event.key === "ArrowRight" || event.key === "ArrowLeft") {
        event.preventDefault();
        const step = event.key === "ArrowRight" ? 15 : -15;
        setReplay((current) => seekReplay(current, match, Math.max(0, Math.min(match.metadata.durationSeconds, current.elapsedSeconds + step))));
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <div className={`studio ${isAnalyst ? "is-analyst" : "is-fan"}`}>
      <header className="studio-bar">
        <div className="studio-bar-inner">
          <Brand href="#/" label="Matchwork, back to home" />
          <nav className="studio-nav" aria-label="Dashboard sections">
            <button type="button" onClick={() => scrollTo("match")}>Replay</button>
            <button type="button" onClick={() => scrollTo("insights")}>Insight</button>
            <button type="button" onClick={() => scrollTo("numbers")}>Statistics</button>
          </nav>
          <div className="studio-bar-end">
            <span className="studio-data-note" title="All teams, players and events are fictional. No live Premier League data or personal information.">
              <Info aria-hidden="true" /> Synthetic data only
            </span>
            <ThemeToggle />
          </div>
        </div>
        <span className="studio-progress" style={{ transform: `scaleX(${progressPct / 100})` }} aria-hidden="true" />
      </header>

      <motion.main className="studio-main" id="match" initial="hidden" animate="show" variants={{ show: { transition: { staggerChildren: 0.08 } } }}>
        <motion.div className="studio-head" variants={enter}>
          <div>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div key={audience} {...swap}>
                <h1>{isAnalyst ? "Analysis desk" : "Match center"}</h1>
                <p>{isAnalyst ? "Evidence, timelines and match analysis." : "Follow the match your way."}</p>
              </motion.div>
            </AnimatePresence>
          </div>
          <Segmented id="studio-view" label="Choose viewing experience" value={audience} onChange={setAudience} options={[
            { value: "fan", label: "Fan view", icon: <Users aria-hidden="true" /> },
            { value: "analyst", label: "Analyst view", icon: <ChartColumn aria-hidden="true" /> },
          ]} />
        </motion.div>

        {match.metadata.id === demoMatch.id && (
          <section className="card" aria-label="Microsoft Foundry narrative preview">
            <div className="card-head">
              <div><span className="eyebrow">AI insight · Original fixture</span><h2>Microsoft Foundry narration</h2></div>
              <span className="count">Public preview · No sign-in</span>
            </div>
            <p>Pause the match at any moment, then generate an evidence-linked Foundry narrative. No API key or login is required. The demo has a limited shared quota; replay, ONNX and recaps always remain available.</p>
            <button type="button" className="btn btn-primary btn-sm" disabled={publicAiBusy || replay.status === "playing" || !frame.latestEvent}
              onClick={() => { void generatePublicNarrative(); }}>
              {publicAiBusy ? "Generating AI insight…" : "Generate AI narrative"}
            </button>
            {publicAiNotice && <p role="status">{publicAiNotice}</p>}
            <details>
              <summary>Project operator access (optional)</summary>
              {operatorReady ? (
                <p>Operator session active. Paused moments also request the authenticated specialist workflow.</p>
              ) : (
                <form onSubmit={(event) => { event.preventDefault(); void enableOperatorAI(); }}>
                  <p>For project owners: sign in for the separately authenticated operator workflow.</p>
                  <label htmlFor="operator-demo-code">Operator access code</label>
                  <input id="operator-demo-code" type="password" autoComplete="off" value={operatorCode} onChange={(e) => setOperatorCode(e.target.value)} required minLength={32} maxLength={256} />
                  <button className="btn btn-secondary btn-sm" type="submit" disabled={operatorBusy || operatorCode.length < 32}>{operatorBusy ? "Connecting…" : "Enable operator mode"}</button>
                  {operatorError && <p role="alert">{operatorError}</p>}
                </form>
              )}
            </details>
          </section>
        )}
        <motion.section className="card phase8-fixtures" variants={enter} aria-label="Choose a fictional match">
          <div className="card-head">
            <div><span className="eyebrow">Explore the league</span><h2>Choose your match</h2></div>
            <div className="league-clubs">
              <span className="league-crests" aria-hidden="true">{leagueTeams.map((team) => <TeamCrest key={team.id} team={team} size="xs" />)}</span>
              <span className="count">{leagueTeams.length} clubs · {leagueFixtures.length} fixtures</span>
            </div>
          </div>
          <FixturePicker fixtures={leagueFixtures} value={selectedFixture} onChange={onSelectFixture} featuredId={demoMatch.id} />
          <FixtureStrip fixtures={leagueFixtures} teams={leagueTeams} value={selectedFixture} onChange={onSelectFixture} />
          {match.metadata.id !== demoMatch.id && <p className="phase8-notice">This synthetic fixture supports replay, in-browser model insights and player stats. Secure Foundry narration is limited to the canonical original match until the server ledger is expanded.</p>}
        </motion.section>

        <motion.section className="card scoreboard" aria-label="Match scoreboard and replay" variants={enter}>
          <div className="scoreboard-top">
            <span className="scoreboard-title">{match.metadata.title}</span>
            <span className={`status-chip is-${replay.status}`}><span className="status-dot" aria-hidden="true" />{statusLabel}</span>
          </div>

          <div className="scoreline">
            <div className="team team-home">
              <TeamCrest team={homeTeam} size="lg" className="scoreline-crest" />
              <div><h2>{homeTeam.name}</h2><small>Home</small></div>
            </div>
            <div className="score-center">
              <div className="score tabular" aria-label={`${homeTeam.name} ${home.goals}, ${awayTeam.name} ${away.goals}`}>
                <span className="score-digit"><AnimatePresence mode="popLayout" initial={false}><motion.span key={home.goals} {...digit}>{home.goals}</motion.span></AnimatePresence></span>
                <span className="score-sep" aria-hidden="true">–</span>
                <span className="score-digit"><AnimatePresence mode="popLayout" initial={false}><motion.span key={away.goals} {...digit}>{away.goals}</motion.span></AnimatePresence></span>
              </div>
              <div className="score-clock tabular">{formatClock(replay.elapsedSeconds)} <span>/ {formatClock(durationSeconds)}</span></div>
            </div>
            <div className="team team-away">
              <div><h2>{awayTeam.name}</h2><small>Away</small></div>
              <TeamCrest team={awayTeam} size="lg" className="scoreline-crest" />
            </div>
            <div className="goal-flash-slot" aria-live="polite">
              <AnimatePresence>
                {goalFlash && (
                  <motion.div key={goalFlash.id} className={`goal-flash is-${goalFlash.side}`}
                    initial={{ opacity: 0, y: 8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 380, damping: 22 } }}
                    exit={{ opacity: 0, y: -6, transition: { duration: 0.25, ease: EASE_IN } }}>
                    <strong>Goal</strong> {goalFlash.team} · <span className="tabular">{formatClock(goalFlash.time)}</span>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <div className="timeline" onPointerMove={onTimelineHover} onPointerLeave={() => setHover(null)}>
            <div className="timeline-marks">
              <span className="timeline-half" style={{ left: "50%" }} aria-hidden="true" />
              {shotMarks.map((shot) => {
                const left = `${(100 * shot.elapsedSeconds) / durationSeconds}%`;
                const team = shot.teamId === homeTeam.id ? "is-home" : "is-away";
                return shot.outcome === "goal" ? (
                  <motion.button key={shot.id} type="button" className={`timeline-goal ${team}`} style={{ left, x: "-50%" }} onClick={() => onSeek(shot.elapsedSeconds)}
                    initial={{ scale: 0 }} animate={{ scale: 1 }} whileHover={{ scale: 1.25 }} transition={{ type: "spring", stiffness: 500, damping: 18 }}
                    aria-label={`Goal, ${eventLabel(shot)} at ${formatClock(shot.elapsedSeconds)}. Jump to this moment`} title={`Goal, ${eventLabel(shot)} ${formatClock(shot.elapsedSeconds)}`} />
                ) : (
                  <motion.span key={shot.id} className={`timeline-shot ${team}`} style={{ left, x: "-50%" }} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ duration: 0.3, ease: EASE_OUT }} aria-hidden="true" />
                );
              })}
            </div>
            <AnimatePresence>
              {hover && (
                <motion.span className="timeline-tip tabular" style={{ left: `calc(9px + (100% - 18px) * ${hover.ratio})`, x: "-50%" }} aria-hidden="true"
                  initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} transition={{ duration: 0.15 }}>
                  {formatClock(hover.time)}
                </motion.span>
              )}
            </AnimatePresence>
            <input id="match-progress" className="timeline-range" type="range" min={0} max={durationSeconds} step={1} value={replay.elapsedSeconds}
              aria-label="Seek match replay time" aria-valuetext={formatClock(replay.elapsedSeconds)}
              style={{ "--progress": `${progressPct}%` } as CSSProperties}
              onChange={(event) => onSeek(Number(event.target.value))} />
            <div className="timeline-labels tabular"><span>Kick-off</span><span>Half-time 45:00</span><span>Full time</span></div>
          </div>

          <div className="controls">
            <div className="controls-main">
              <motion.button className="btn btn-primary play-btn" type="button" disabled={replay.status === "finished"} aria-label={isPlaying ? "Pause match replay" : "Play match replay"}
                whileTap={{ scale: 0.96 }}
                onClick={() => setReplay((current) => isPlaying ? pauseReplay(current) : playReplay(current, match))}>
                <AnimatePresence mode="wait" initial={false}>
                  <motion.span key={isPlaying ? "pause" : "play"} className="play-icon" initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.6 }} transition={{ duration: 0.15 }}>
                    {isPlaying ? <Pause aria-hidden="true" /> : <Play aria-hidden="true" />}
                  </motion.span>
                </AnimatePresence>
                {isPlaying ? "Pause" : "Play"}
              </motion.button>
              <motion.button className="icon-btn icon-btn-outline" type="button" aria-label="Restart match replay" title="Restart match replay"
                whileTap={{ rotate: -120, scale: 0.94 }} transition={SPRING_UI}
                onClick={() => { setReplay((current) => restartReplay(current)); setDismissedEventId(null); }}>
                <RotateCcw aria-hidden="true" />
              </motion.button>
              <Segmented id="studio-speed" label="Replay speed" size="sm" value={replay.speed} onChange={(speed) => setReplay((current) => setReplaySpeed(current, speed))}
                options={REPLAY_SPEEDS.map((speed) => ({ value: speed, label: `${speed}×` }))} />
            </div>
            <span className="controls-note">
              <span>{isPlaying ? "The story unfolds in real time." : "Drag the timeline or pick a goal marker."}</span>
              <span className="kbd-hint"><kbd>Space</kbd> play or pause · <kbd>←</kbd><kbd>→</kbd> 15s</span>
            </span>
          </div>
        </motion.section>

        <div className="studio-grid" id="insights">
          <motion.div className="studio-col" variants={enter}>
            <section className="card insight" aria-label="Match intelligence">
              <div className="insight-head">
                <div>
                  <span className="eyebrow">{isAnalyst ? "Analysis" : "Your match story"} · <span className="tabular">{formatClock(replay.elapsedSeconds)}</span></span>
                  <h2>{isAnalyst ? "Match intelligence" : "What's happening?"}</h2>
                </div>
              </div>

              <TeamFollow label={isAnalyst ? "Analysis target" : "Follow a team"} value={favoriteTeam} home={homeTeam} away={awayTeam} onChange={followTeam} />

              <Collapse show={isAnalyst}>
                <div className="model-strip">
                  <span className={`model-status is-${modelDisplayStatus}`}>
                    <span className="status-dot" aria-hidden="true" />
                    {modelDisplayStatus === "ready" ? "ONNX inference available" : modelDisplayStatus === "loading" ? "ONNX inference pending" : "ONNX inference unavailable"}
                  </span>
                  <dl className="model-times tabular">
                    <div><dt>Replay time</dt><dd>{formatClock(replay.elapsedSeconds)}</dd></div>
                    <div><dt>Model sample</dt><dd>{formatClock(modelSampleTime)}</dd></div>
                    <div><dt>Feature window</dt><dd>180s rolling</dd></div>
                  </dl>
                </div>
              </Collapse>

              <div className="insight-lead-slot">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div key={`${audience}:${headline}`} className="insight-lead" {...swap}>
                    <h3>{headline}</h3>
                    <p>{narrative}</p>
                  </motion.div>
                </AnimatePresence>
              </div>

              <motion.div className="insight-why" layout="position">
                <span className="label">{isAnalyst ? "Interpretation" : "Why it matters"}</span>
                <p>{whyText}</p>
              </motion.div>

              <Collapse show={isAnalyst}>
                <div className="classifier">
                  <div className="classifier-head"><span className="label">Classifier output</span><small>Not calibrated probabilities</small></div>
                  {visibleModel && prediction ? (["CONTROL", "PRESSURE", "TRANSITION"] as const).map((label, index) => {
                    const value = prediction.probabilities[index];
                    return (
                      <div className={`prob${value === topProbability ? " is-top" : ""}`} key={label}>
                        <span className="prob-label">{label.charAt(0) + label.slice(1).toLowerCase()}</span>
                        <span className="prob-track"><motion.span initial={false} animate={{ width: `${value * 100}%` }} transition={SPRING_BAR} /></span>
                        <strong className="tabular">{(value * 100).toFixed(1)}%</strong>
                      </div>
                    );
                  }) : <p className="muted">No validated ONNX result for this replay sample.</p>}
                </div>
                <details className="evidence" open={detailsOpen} onToggle={(event) => setDetailsOpen(event.currentTarget.open)}>
                  <summary><span>Event evidence and model details</span><ChevronDown aria-hidden="true" /></summary>
                  <ul className="evidence-list">{insight.evidence.map((datum) => <li key={datum}>{datum}</li>)}</ul>
                  <div className="evidence-ids">
                    <span className="label">Observed event IDs</span>
                    <p>{insight.evidenceEventIds.length ? insight.evidenceEventIds.map((id) => <code key={id}>{id}</code>) : "No events in this window"}</p>
                  </div>
                  <p className="evidence-foot">Engine: Microsoft ONNX Runtime Web (WASM) · Training: synthetic prototypes · Sample: 15s boundaries</p>
                </details>
                {modelDisplayStatus === "unavailable" && (
                  <div className="alert" role="status">
                    <CircleAlert aria-hidden="true" />
                    <p>ONNX unavailable: {modelError}</p>
                    <button type="button" className="btn btn-secondary btn-sm" onClick={() => setRetryCount((n) => n + 1)}><RefreshCw aria-hidden="true" /> Retry classifier</button>
                  </div>
                )}
              </Collapse>
            </section>

            <section className="card story-desk" aria-label="Match story and quick recap">
              <div className="card-head">
                <div>
                  <span className="eyebrow">{isAnalyst ? "Narrative" : "Story time"} · <span className="tabular">{formatClock(replay.elapsedSeconds)}</span></span>
                  <h2>{isAnalyst ? "Explanation and recap" : "Match story and quick recap"}</h2>
                </div>
                <span className={`status-chip is-${replay.status}`}><span className="status-dot" aria-hidden="true" />{isPlaying ? "Live" : statusLabel}</span>
              </div>
              <div className="story-panels">
                <article className="story-panel is-story" aria-label={isAnalyst ? "Generated explanation" : "Match story"}>
                  <div className="story-panel-head">
                    <span className="story-icon" aria-hidden="true"><BookOpen /></span>
                    <span className="story-title">{isAnalyst ? "Generated explanation" : "Match story"}</span>
                    {(isAnalyst || visibleAiInsight?.source === "foundry") && <span className={`source-tag is-${visibleAiInsight?.source ?? "pending"}`}>{sourceLabel}</span>}
                  </div>
                  <AnimatePresence mode="wait" initial={false}>
                    <motion.div key={isAnalyst ? "analyst" : "fan"} className="story-panel-copy" {...swap}>
                      <p>{storyText}</p>
                    </motion.div>
                  </AnimatePresence>
                  <small className="story-note">{storyNote}</small>
                </article>
                <article className="story-panel is-recap" aria-label="Quick recap">
                  <div className="story-panel-head">
                    <span className="story-icon" aria-hidden="true"><ListChecks /></span>
                    <span className="story-title">Quick recap</span>
                    <span className="story-through tabular">Through {formatClock(replay.elapsedSeconds)}</span>
                  </div>
                  <dl className="recap-tiles">
                    {recapTiles.map((tile) => (
                      <div key={tile.label}>
                        <dt>{tile.label}</dt>
                        <dd className="tabular"><strong>{tile.home + tile.away}</strong>
                          <span><i className="legend-dot is-home" />{tile.home}<span className="recap-sep">–</span>{tile.away}<i className="legend-dot is-away" /></span>
                        </dd>
                      </div>
                    ))}
                  </dl>
                  <p>{recap}</p>
                  <small className="story-note">Rule-generated from observed synthetic events · {homeTeam.abbreviation} vs {awayTeam.abbreviation}</small>
                </article>
              </div>
            </section>

            <AnimatePresence initial={false}>
              {latestMoment && showMoment && (
                <motion.aside className="moment" aria-label="Latest match moment"
                  initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }} exit={{ opacity: 0, y: 8, transition: { duration: 0.2, ease: EASE_IN } }}>
                  <AnimatePresence mode="popLayout" initial={false}>
                    <motion.span key={latestMoment.id} className={`event-icon is-${latestMoment.teamId === homeTeam.id ? "home" : "away"}`}
                      initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.5, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
                      <EventIcon type={latestMoment.type} />
                    </motion.span>
                  </AnimatePresence>
                  <div className="moment-copy">
                    <small className="tabular">Latest moment · {formatClock(latestMoment.elapsedSeconds)}</small>
                    <strong>{describeEvent(latestMoment)}</strong>
                    <span>{eventLabel(latestMoment)} · {isAnalyst ? `Event ${latestMoment.id} · ${latestMoment.playerId}` : "Action from the pitch"}</span>
                  </div>
                  <button className="icon-btn" type="button" onClick={() => setDismissedEventId(latestMoment.id)} aria-label="Dismiss match moment"><X aria-hidden="true" /></button>
                </motion.aside>
              )}
            </AnimatePresence>
          </motion.div>

          <motion.div className="studio-col studio-side" variants={enter}>
            <section className="card" aria-label="Observed event location on pitch">
              <div className="card-head">
                <div><span className="eyebrow">From the pitch</span><h2>{isAnalyst ? "Observed event position" : "Where the action is"}</h2></div>
                <div className="legend"><span><i className="legend-dot is-home" />{homeTeam.abbreviation}</span><span><i className="legend-dot is-away" />{awayTeam.abbreviation}</span></div>
              </div>
              <div className="pitch-toolbar">
                <Segmented id="studio-pitch" label="Events shown on the pitch" size="sm" value={pitchMode} onChange={setPitchMode} options={[
                  { value: "recent", label: "Latest 5" },
                  { value: "window", label: "Last 3 min" },
                ]} />
                <span className="count tabular">{pitchEvents.length} {pitchEvents.length === 1 ? "event" : "events"}</span>
              </div>
              <div className="pitch-frame">
                <ActionPitch events={pitchEvents} match={match} roster={roster} isAnalyst={isAnalyst} path={pitchMode === "recent"} fade={pitchMode === "window"}
                  onOpenPlayer={(playerId) => setSelectedPlayer(playerId)}
                  label={latestMoment ? `Latest observed event location, ${Math.round(latestMoment.x)} percent along and ${Math.round(latestMoment.y)} percent across the pitch. Hover or focus a dot for player and team details.` : "Pitch visualization awaiting the first event"} />
              </div>
              <p className="card-foot tabular">{latestMoment ? `${formatClock(latestMoment.elapsedSeconds)} · ${describeEvent(latestMoment)}${momentActor ? ` · ${momentActor.player.name}` : ""}` : "Start the replay to see where recorded match events occur."}</p>
            </section>

            <section className="card feed-card" aria-label="Recent match events">
              <div className="card-head">
                <div><span className="eyebrow">Play by play</span><h2>{isAnalyst ? "Observed event stream" : "Latest action"}</h2></div>
                <span className="count tabular">{frame.stats.processedEvents} events</span>
              </div>
              {visibleEvents.length === 0 ? (
                <p className="empty">The opening whistle is coming. Press play to begin.</p>
              ) : (
                <ol className="feed">
                  <AnimatePresence initial={false} mode="popLayout">
                    {visibleEvents.map((event) => (
                      <motion.li key={event.id} layout="position"
                        initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }}
                        transition={{ duration: 0.35, ease: EASE_OUT }}>
                        <button type="button" className="feed-item" onClick={() => onSeek(event.elapsedSeconds)} title="Jump to this moment">
                          <span className={`event-icon is-${event.teamId === homeTeam.id ? "home" : "away"}`}><EventIcon type={event.type} /></span>
                          <span className="feed-body">
                            <strong>{describeEvent(event)}</strong>
                            <small>{eventLabel(event)} · {isAnalyst ? `${event.playerId} · ${event.id}` : "Match event"}</small>
                          </span>
                          <time className="tabular">{formatClock(event.elapsedSeconds)}</time>
                        </button>
                      </motion.li>
                    ))}
                  </AnimatePresence>
                </ol>
              )}
            </section>
          </motion.div>
        </div>

        <motion.section className="card stats" id="numbers" aria-label="Match statistics" variants={enter}>
          <div className="card-head">
            <div><span className="eyebrow">Match stats</span><h2>{isAnalyst ? "Live match statistics" : "Match at a glance"}</h2></div>
            <div className="stats-head-end">
              <Segmented id="studio-statview" label="Statistics visualization" size="sm" className="statview" value={statView} onChange={setStatView} options={[
                { value: "compare", label: <span className="sv-text">Compare</span>, icon: <SlidersHorizontal aria-hidden="true" /> },
                { value: "columns", label: <span className="sv-text">Bar chart</span>, icon: <ChartColumnBig aria-hidden="true" /> },
                { value: "trend", label: <span className="sv-text">Trend</span>, icon: <ChartSpline aria-hidden="true" /> },
                { value: "momentum", label: <span className="sv-text">By period</span>, icon: <Activity aria-hidden="true" /> },
              ]} />
              <span className="count tabular">As of {formatClock(replay.elapsedSeconds)}</span>
            </div>
          </div>
          <div className="possession">
            <div className="possession-row tabular">
              <span><i className="legend-dot is-home" />{homeTeam.abbreviation} <strong>{Math.round(home.possessionPct)}%</strong></span>
              <span className="label">Possession</span>
              <span><strong>{Math.round(away.possessionPct)}%</strong> {awayTeam.abbreviation}<i className="legend-dot is-away" /></span>
            </div>
            <div className="split-bar is-lg"><span className="is-home" style={{ width: `${homeShare}%` }} /><span className="is-away" /></div>
          </div>
          {(statView === "trend" || statView === "momentum") && (
            <div className="metric-picker" role="group" aria-label="Statistic to chart">
              {metricOptions.map((metric) => (
                <button type="button" key={metric.key} className="club-chip" aria-pressed={metric.key === activeMetric.key} onClick={() => setStatMetric(metric.key)}>{metric.label}</button>
              ))}
            </div>
          )}
          <AnimatePresence mode="wait" initial={false}>
            <motion.div key={statView} className="stat-view" {...swap}>
              {statView === "compare" && (
                <div className="stat-grid">
                  <AnimatePresence initial={false}>
                    {statRows.map((stat) => {
                      const total = stat.left + stat.right;
                      const share = total === 0 ? 50 : (100 * stat.left) / total;
                      return (
                        <motion.div className="stat" key={stat.label} layout="position"
                          initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, transition: { duration: 0.15 } }} transition={{ duration: 0.35, ease: EASE_OUT }}>
                          <div className="stat-row tabular">
                            <strong className={stat.left > stat.right ? "is-lead" : ""}>{stat.left}{stat.unit}</strong>
                            <span>{stat.label}</span>
                            <strong className={stat.right > stat.left ? "is-lead" : ""}>{stat.right}{stat.unit}</strong>
                          </div>
                          <div className="split-bar"><span className="is-home" style={{ width: `${share}%` }} /><span className="is-away" /></div>
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                </div>
              )}
              {statView === "columns" && (
                <CompareColumns rows={[{ label: "Possession", left: Math.round(home.possessionPct), right: Math.round(away.possessionPct), unit: "%" }, ...statRows]}
                  homeLabel={homeTeam.abbreviation} awayLabel={awayTeam.abbreviation} />
              )}
              {statView === "trend" && (
                <TrendChart metric={activeMetric} points={trendPoints} duration={durationSeconds} elapsed={replay.elapsedSeconds} goals={goalMarks}
                  homeLabel={homeTeam.abbreviation} awayLabel={awayTeam.abbreviation} />
              )}
              {statView === "momentum" && (
                <MomentumChart metric={activeMetric} buckets={momentumBuckets} homeLabel={homeTeam.abbreviation} awayLabel={awayTeam.abbreviation} />
              )}
            </motion.div>
          </AnimatePresence>
          <p className="stat-foot">
            {statView === "compare" && "Share of each statistic between the two teams."}
            {statView === "columns" && "Each pair of bars is scaled to its own statistic; percentages share a 0–100 scale."}
            {statView === "trend" && `${activeMetric.label} for both teams, sampled every minute up to the replay clock. Goal markers sit on the time axis.`}
            {statView === "momentum" && `${activeMetric.label} inside each 15-minute period. The current period updates live.`}
          </p>
        </motion.section>

        <motion.section className="card phase8-players" id="players" variants={enter} aria-label="Synthetic player performance">
          <div className="card-head">
            <div><span className="eyebrow">Players · Event-derived</span><h2>Player performance</h2></div>
            <Segmented id="studio-players" label="Statistics period" size="sm" value={playerView} onChange={setPlayerView} options={[
              { value: "replay", label: "Replay so far" },
              { value: "season", label: "All fixtures" },
            ]} />
          </div>
          <p className="phase8-description">Every number below comes from recorded synthetic events. Rest on a card for a quick look, or select it for the full profile and evidence.</p>
          <PlayerBoard players={sourcePlayers} teams={boardTeams} view={playerView} teamFilter={playerTeam} onTeamFilterChange={setPlayerTeam}
            selectedId={selectedPlayer} onSelect={setSelectedPlayer} isAnalyst={isAnalyst} match={match} elapsedSeconds={replay.elapsedSeconds} onSeek={onSeek} />
          <p className="phase8-notice">All players, fixtures and statistics are fictional. These figures are not real-world performance measurements.</p>
        </motion.section>

        <footer className="studio-footer">
          <span>Matchwork. The game, understood.</span>
          <span>Synthetic data use only. Fictional teams, players and events; no real match data or personal information. Model scores are illustrative.</span>
        </footer>
      </motion.main>
    </div>
  );
}

/** Height-animated show/hide for blocks that only exist in one view. */
function Collapse({ show, children }: { show: boolean; children: ReactNode }) {
  return (
    <AnimatePresence initial={false}>
      {show && (
        <motion.div className="mw-collapse" initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ height: { duration: 0.4, ease: EASE_OUT }, opacity: { duration: 0.25 } }}>
          <div className="mw-collapse-inner">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

const enter = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: EASE_OUT } },
};

const digit = {
  initial: { y: "-70%", opacity: 0 },
  animate: { y: "0%", opacity: 1, transition: { type: "spring", stiffness: 420, damping: 24 } },
  exit: { y: "70%", opacity: 0, transition: { duration: 0.2, ease: EASE_IN } },
} as const;

function App() {
  const [selectedFixture, setSelectedFixture] = useState(leagueFixtures[0].id);
  const activeFixture = leagueFixtures.find(f => f.id === selectedFixture) ?? leagueFixtures[0];
  const [page, setPage] = useState<"landing" | "studio">(
    () => window.location.hash.startsWith("#/studio") ? "studio" : "landing",
  );

  useEffect(() => {
    const onRouteChange = () => {
      const hash = window.location.hash;
      if (hash.startsWith("#/studio")) {
        setPage("studio");
        window.scrollTo(0, 0);
      } else if (hash === "#/" || hash === "") {
        setPage("landing");
        window.scrollTo(0, 0);
      }
    };
    window.addEventListener("hashchange", onRouteChange);
    return () => window.removeEventListener("hashchange", onRouteChange);
  }, []);

  return (
    <MotionConfig reducedMotion="user">
      <AnimatePresence mode="wait">
        <motion.div key={page} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { duration: 0.35 } }} exit={{ opacity: 0, transition: { duration: 0.2 } }}>
          {page === "landing" ? <LandingPage match={match} /> : <MatchStudio key={activeFixture.id} match={activeFixture.match} selectedFixture={activeFixture.id} onSelectFixture={setSelectedFixture} />}
        </motion.div>
      </AnimatePresence>
    </MotionConfig>
  );
}

export default App;
