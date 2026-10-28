import { useRef } from "react";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "motion/react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

/**
 * Original scroll-linked transition between the match story and its two views.
 * Native scrolling remains intact; every message is readable without animation.
 */
export function NarrativeInterlude() {
  const ref = useRef<HTMLElement>(null);
  const reduced = useReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start end", "end start"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 24, restDelta: 0.001 });
  const titleX = useTransform(progress, [0, 1], ["-5%", "5%"]);
  const echoX = useTransform(progress, [0, 1], ["8%", "-8%"]);
  const axisRotate = useTransform(progress, [0, 1], [-18, 18]);
  const axisScale = useTransform(progress, [0, 0.55, 1], [0.85, 1.16, 0.94]);

  return (
    <section ref={ref} className="lp-cinema" aria-labelledby="cinema-title">
      <div className="lp-cinema-stage">
        <div className="lp-cinema-grid" aria-hidden="true" />
        <motion.div className="lp-cinema-orbit" aria-hidden="true"
          style={reduced ? undefined : { rotate: axisRotate, scale: axisScale }}>
          <span /><span /><span />
        </motion.div>
        <div className="lp-cinema-meta">
          <span>THE MATCHWORK METHOD / 01—03</span>
          <span>SCROLL TO FOLLOW THE EVIDENCE <ArrowDownRight aria-hidden="true" /></span>
        </div>
        <div className="lp-cinema-words">
          <motion.p className="lp-cinema-overline" style={reduced ? undefined : { x: echoX }}>
            Every moment leaves a trace.
          </motion.p>
          <h2 id="cinema-title">
            <motion.span style={reduced ? undefined : { x: titleX }}>From the</motion.span>
            <motion.span className="lp-cinema-accent" style={reduced ? undefined : { x: echoX }}>pitch to proof.</motion.span>
          </h2>
          <p className="lp-cinema-description">See the event. Follow the evidence. Understand the game. The same recorded moments power every view.</p>
        </div>
        <div className="lp-cinema-sequence" aria-label="The Matchwork explanation process">
          <span><strong>01</strong> Events</span>
          <span className="lp-cinema-sequence-line" aria-hidden="true" />
          <span><strong>02</strong> Evidence</span>
          <span className="lp-cinema-sequence-line" aria-hidden="true" />
          <span><strong>03</strong> Insight <ArrowUpRight aria-hidden="true" /></span>
        </div>
      </div>
    </section>
  );
}
