import { useState, type PointerEvent as ReactPointerEvent } from "react";
import { AnimatePresence, motion } from "motion/react";
import { SPRING_BAR } from "../motion";
import { formatClock } from "./format";
import { niceMax, type StatMetric } from "./statSeries";

export interface CompareRow { label: string; left: number; right: number; unit?: string }

interface Sides { homeLabel: string; awayLabel: string }

/** Grouped column chart: one pair of bars per statistic. Percentages share a 0–100 scale. */
export function CompareColumns({ rows, homeLabel, awayLabel }: { rows: CompareRow[] } & Sides) {
  return (
    <div className="columns-chart" role="list" aria-label="Statistics bar chart">
      {rows.map((row) => {
        const scale = row.unit === "%" ? 100 : Math.max(1, row.left, row.right);
        return (
          <div className="col-group" role="listitem" key={row.label}
            aria-label={`${row.label}: ${homeLabel} ${row.left}${row.unit ?? ""}, ${awayLabel} ${row.right}${row.unit ?? ""}`}>
            <div className="col-bars" aria-hidden="true">
              {([["home", row.left], ["away", row.right]] as const).map(([side, value]) => (
                <div className="col-bar-slot" key={side}>
                  <motion.span className={`col-bar is-${side}`} initial={false} animate={{ height: `${(100 * value) / scale}%` }} transition={SPRING_BAR}>
                    <span className={`col-value tabular${value > (side === "home" ? row.right : row.left) ? " is-lead" : ""}`}>{value}{row.unit}</span>
                  </motion.span>
                </div>
              ))}
            </div>
            <span className="col-label">{row.label}</span>
          </div>
        );
      })}
    </div>
  );
}

export interface TrendPoint { t: number; home: number; away: number }

interface TrendChartProps extends Sides {
  metric: StatMetric;
  points: TrendPoint[];
  duration: number;
  elapsed: number;
  goals: { id: string; t: number; side: "home" | "away" }[];
}

/** Cumulative trend lines for both teams up to the replay clock. */
export function TrendChart({ metric, points, duration, elapsed, goals, homeLabel, awayLabel }: TrendChartProps) {
  const [hover, setHover] = useState<number | null>(null);
  const max = metric.unit === "%" ? 100 : niceMax(Math.max(0, ...points.flatMap((p) => [p.home, p.away])));
  const X = (t: number) => (1000 * t) / duration;
  const Y = (v: number) => 1000 - (1000 * v) / max;
  const line = (side: "home" | "away") => points.map((p) => `${X(p.t).toFixed(1)},${Y(p[side]).toFixed(1)}`).join(" ");
  const area = (side: "home" | "away") => points.length > 1
    ? `M${X(points[0].t)},1000 L${points.map((p) => `${X(p.t).toFixed(1)},${Y(p[side]).toFixed(1)}`).join(" L")} L${X(points.at(-1)!.t)},1000 Z`
    : "";
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => Math.round(f * max * 10) / 10);
  const minutes = Array.from({ length: Math.floor(duration / 900) + 1 }, (_, i) => i * 900);
  const lastPoint = points.at(-1);
  const hovered = hover !== null ? points[hover] : null;

  const onMove = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (points.length === 0) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const t = Math.min(elapsed, Math.max(0, ((event.clientX - rect.left) / Math.max(1, rect.width)) * duration));
    let best = 0;
    for (let i = 1; i < points.length; i += 1) if (Math.abs(points[i].t - t) < Math.abs(points[best].t - t)) best = i;
    setHover(best);
  };

  const valueText = (v: number) => `${v}${metric.unit ?? ""}`;
  return (
    <figure className="trend" aria-label={`${metric.label} over time. ${lastPoint ? `${homeLabel} ${valueText(lastPoint.home)}, ${awayLabel} ${valueText(lastPoint.away)} at ${formatClock(lastPoint.t)}` : "No data yet"}`}>
      <div className="trend-y tabular" aria-hidden="true">{ticks.slice().reverse().map((v) => <span key={v}>{v}{metric.unit}</span>)}</div>
      <div className="trend-plot" onPointerMove={onMove} onPointerLeave={() => setHover(null)}>
        {ticks.map((v) => <span key={v} className="trend-grid" style={{ bottom: `${(100 * v) / max}%` }} aria-hidden="true" />)}
        <span className="trend-half" aria-hidden="true" />
        <span className="trend-future" style={{ left: `${(100 * elapsed) / duration}%` }} aria-hidden="true" />
        <svg className="trend-svg" viewBox="0 0 1000 1000" preserveAspectRatio="none" aria-hidden="true">
          <path className="trend-area is-home" d={area("home")} />
          <path className="trend-area is-away" d={area("away")} />
          <polyline className="trend-line is-away" points={line("away")} vectorEffect="non-scaling-stroke" />
          <polyline className="trend-line is-home" points={line("home")} vectorEffect="non-scaling-stroke" />
        </svg>
        {lastPoint && (["home", "away"] as const).map((side) => (
          <span key={side} className={`trend-dot is-${side}`} style={{ left: `${X(lastPoint.t) / 10}%`, bottom: `${(100 * lastPoint[side]) / max}%` }} aria-hidden="true" />
        ))}
        {goals.map((goal) => (
          <span key={goal.id} className={`trend-goal is-${goal.side}`} style={{ left: `${X(goal.t) / 10}%` }} title={`Goal · ${goal.side === "home" ? homeLabel : awayLabel} · ${formatClock(goal.t)}`} aria-hidden="true" />
        ))}
        {points.length <= 1 && <span className="trend-empty">Press play to draw the trend.</span>}
        <AnimatePresence>
          {hovered && (
            <motion.div className="trend-cross" style={{ left: `${X(hovered.t) / 10}%` }} aria-hidden="true"
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} transition={{ duration: 0.12 }}>
              <span className="trend-cross-dot is-home" style={{ bottom: `${(100 * hovered.home) / max}%` }} />
              <span className="trend-cross-dot is-away" style={{ bottom: `${(100 * hovered.away) / max}%` }} />
              <div className={`trend-tip${hovered.t > duration * 0.7 ? " is-left" : ""}`}>
                <small className="tabular">{formatClock(hovered.t)}</small>
                <span><i className="legend-dot is-home" />{homeLabel} <strong className="tabular">{valueText(hovered.home)}</strong></span>
                <span><i className="legend-dot is-away" />{awayLabel} <strong className="tabular">{valueText(hovered.away)}</strong></span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="trend-x tabular" aria-hidden="true">
        {minutes.map((t) => <span key={t} style={{ left: `${(100 * t) / duration}%` }}>{t / 60}'</span>)}
      </div>
    </figure>
  );
}

export interface MomentumBucket { label: string; home: number | null; away: number | null; live: boolean }

/** Per-15-minute bars: home grows up, away grows down from a shared axis. */
export function MomentumChart({ metric, buckets, homeLabel, awayLabel }: { metric: StatMetric; buckets: MomentumBucket[] } & Sides) {
  const values = buckets.flatMap((b) => (b.home === null || b.away === null ? [] : [b.home, b.away]));
  const max = metric.unit === "%" ? 100 : niceMax(Math.max(0, ...values));
  return (
    <div className="momentum">
      <div className="momentum-key" aria-hidden="true">
        <span><i className="legend-dot is-home" />{homeLabel} ↑</span>
        <span><i className="legend-dot is-away" />{awayLabel} ↓</span>
      </div>
      <div className="momentum-cols" role="list" aria-label={`${metric.label} per 15-minute period`}>
        {buckets.map((bucket) => {
          const played = bucket.home !== null && bucket.away !== null;
          return (
            <div key={bucket.label} role="listitem" className={`momentum-col${bucket.live ? " is-live" : ""}${played ? "" : " is-future"}`}
              aria-label={played ? `${bucket.label}: ${homeLabel} ${bucket.home}${metric.unit ?? ""}, ${awayLabel} ${bucket.away}${metric.unit ?? ""}${bucket.live ? ", in progress" : ""}` : `${bucket.label}: not played yet`}>
              <div className="momentum-half is-home" aria-hidden="true">
                {played && (
                  <motion.span className="momentum-bar is-home" initial={false} animate={{ height: `${(100 * bucket.home!) / max}%` }} transition={SPRING_BAR}>
                    <span className="momentum-value tabular">{bucket.home}{metric.unit}</span>
                  </motion.span>
                )}
              </div>
              <div className="momentum-half is-away" aria-hidden="true">
                {played && (
                  <motion.span className="momentum-bar is-away" initial={false} animate={{ height: `${(100 * bucket.away!) / max}%` }} transition={SPRING_BAR}>
                    <span className="momentum-value tabular">{bucket.away}{metric.unit}</span>
                  </motion.span>
                )}
              </div>
              <span className="momentum-label tabular" aria-hidden="true">{bucket.label}{bucket.live && <em>Live</em>}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
