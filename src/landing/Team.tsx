import { useRef, useSyncExternalStore } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";
import { ArrowUpRight } from "lucide-react";

// Sourced from the repository's GitHub collaborators and commit authors.
const MEMBERS = [
  { handle: "Kanechiii", name: "Kenneth Gabriel Alido", role: "Project lead · Repository owner" },
  { handle: "gyryan", name: "Mark Ryan Songalia", role: "Collaborator" },
  { handle: "Mark-Gerald", name: "Mark Gerald", role: "Collaborator" },
];

const HEADLINE = "Three people. One match, read properly.".split(" ");
const QUERY = "(min-width: 900px)";

function subscribe(cb: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener("change", cb);
  return () => mq.removeEventListener("change", cb);
}
const isWide = () => window.matchMedia(QUERY).matches;

function Word({ word, i, progress }: { word: string; i: number; progress: MotionValue<number> }) {
  const span = 0.32 / HEADLINE.length;
  const opacity = useTransform(progress, [i * span, (i + 1) * span], [0.14, 1]);
  const y = useTransform(progress, [i * span, (i + 1) * span], ["0.35em", "0em"]);
  return <motion.span className="lp-team-word" style={{ opacity, y }} aria-hidden="true">{word}&nbsp;</motion.span>;
}

function Member({ m, i, progress }: { m: (typeof MEMBERS)[number]; i: number; progress: MotionValue<number> }) {
  const start = 0.3 + i * 0.16;
  const range = [start, start + 0.24];
  const clipPath = useTransform(progress, range, ["inset(100% 0% 0% 0%)", "inset(0% 0% 0% 0%)"]);
  const scale = useTransform(progress, range, [1.35, 1]);
  const y = useTransform(progress, range, [80, 0]);
  const opacity = useTransform(progress, [start + 0.14, start + 0.26], [0, 1]);
  return (
    <motion.li className="lp-team-card" style={{ y }}>
      <motion.div className="lp-team-photo" style={{ clipPath }}>
        <motion.img src={`https://github.com/${m.handle}.png?size=480`} alt={`${m.name} on GitHub`} loading="lazy" style={{ scale }} />
        <span className="lp-team-index">0{i + 1}</span>
      </motion.div>
      <motion.div className="lp-team-meta" style={{ opacity }}>
        <strong>{m.name}</strong>
        <span>{m.role}</span>
        <a href={`https://github.com/${m.handle}`} target="_blank" rel="noreferrer">@{m.handle} <ArrowUpRight aria-hidden="true" /></a>
      </motion.div>
    </motion.li>
  );
}

/** Pinned storytelling beat: headline fills word by word, then portraits wipe in one after another. */
export function Team() {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const wide = useSyncExternalStore(subscribe, isWide, () => true);
  const pinned = wide && !reduce;
  const { scrollYProgress } = useScroll({ target: ref, offset: pinned ? ["start start", "end end"] : ["start 0.9", "end 0.7"] });
  const still = useTransform(scrollYProgress, () => 1);
  const progress = reduce ? still : scrollYProgress;
  const rule = useTransform(progress, [0, 0.3], [0, 1]);

  return (
    <section ref={ref} className={`lp-team${pinned ? " is-pinned" : ""}`} id="team" aria-labelledby="team-title">
      <div className="lp-team-stage">
        <div className="lp-team-head">
          <p className="lp-team-eyebrow">The team</p>
          <h2 id="team-title" aria-label={HEADLINE.join(" ")}>
            {HEADLINE.map((w, i) => <Word key={i} word={w} i={i} progress={progress} />)}
          </h2>
          <motion.span className="lp-team-rule" style={{ scaleX: rule }} aria-hidden="true" />
        </div>
        <ul className="lp-team-grid">
          {MEMBERS.map((m, i) => <Member key={m.handle} m={m} i={i} progress={progress} />)}
        </ul>
      </div>
    </section>
  );
}
