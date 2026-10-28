import { useRef, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform, type MotionValue } from "motion/react";

/*
  Scroll-scrubbed storytelling motion shared by landing sections (same language as the Team beat):
  headlines fill word by word, large panels open from a framed wipe and settle to full size.
*/

function Word({ word, i, total, progress }: { word: string; i: number; total: number; progress: MotionValue<number> }) {
  const range = [i / total, (i + 1) / total];
  const opacity = useTransform(progress, range, [0.14, 1]);
  const y = useTransform(progress, range, ["0.3em", "0em"]);
  return <motion.span style={{ opacity, y, display: "inline-block" }} aria-hidden="true">{word}&nbsp;</motion.span>;
}

export function ScrollHeading({ id, text, className }: { id: string; text: string; className?: string }) {
  const ref = useRef<HTMLHeadingElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.92", "start 0.5"] });
  if (reduce) return <h2 id={id} className={className}>{text}</h2>;
  const words = text.split(" ");
  return (
    <h2 ref={ref} id={id} className={className} aria-label={text}>
      {words.map((w, i) => <Word key={i} word={w} i={i} total={words.length} progress={scrollYProgress} />)}
    </h2>
  );
}

const TAGS = { div: motion.div, section: motion.section, article: motion.article };

interface WipeProps { as?: keyof typeof TAGS; className?: string; children: ReactNode; [attr: `aria-${string}`]: string | undefined }

export function WipeReveal({ as = "div", className, children, ...rest }: WipeProps) {
  const ref = useRef<HTMLElement>(null);
  const reduce = useReducedMotion();
  const { scrollYProgress: p } = useScroll({ target: ref, offset: ["start 0.98", "start 0.5"] });
  // Ends slightly outside the box so hover shadows are not clipped once settled.
  const clipPath = useTransform(p, [0, 1], ["inset(16% 9% 16% 9% round 32px)", "inset(-8% -8% -8% -8% round 0px)"]);
  const scale = useTransform(p, [0, 1], [0.92, 1]);
  const y = useTransform(p, [0, 1], [60, 0]);
  const opacity = useTransform(p, [0, 0.35], [0, 1]);
  const Tag = TAGS[as];
  return (
    <Tag ref={ref as never} className={className} style={reduce ? undefined : { clipPath, scale, y, opacity }} {...rest}>
      {children}
    </Tag>
  );
}
