import { useEffect, useState } from "react";
import { motion, useScroll, useSpring } from "motion/react";
import { ArrowRight, ShieldCheck } from "lucide-react";
import type { SyntheticMatch } from "./types/match";
import { Brand } from "./components/Brand";
import { ThemeToggle } from "./components/ThemeToggle";
import { Hero } from "./landing/Hero";
import { Story } from "./landing/Story";
import { Views } from "./landing/Views";
import { Stack } from "./landing/Stack";
import { Repository } from "./landing/Repository";
import { useSampleModel, useSampleMoment } from "./landing/sample";
import { EASE_OUT, STAGGER, reveal } from "./motion";
import "./LandingPage.css";

interface LandingPageProps {
  match: SyntheticMatch;
}

const NAV = [
  { id: "story", label: "The story" },
  { id: "views", label: "Two views" },
  { id: "stack", label: "Microsoft stack" },
  { id: "repository", label: "Repository" },
  { id: "transparency", label: "Transparency" },
];

// From the README's Security, Cost and Limitations section and docs/.
const PRINCIPLES = [
  { term: "Fictional by design", detail: "Every team, player and event is synthetic. No live Premier League data, broadcast footage or licensed feeds are bundled." },
  { term: "Scores are illustrative", detail: "The classifier is trained on synthetic prototypes, not a validated real-world dataset. Its outputs are not calibrated predictions." },
  { term: "Fallbacks are labelled", detail: "A rules-based recap is never presented as a Foundry response. When a model is unavailable, the studio says so instead of guessing." },
  { term: "Evidence you can trace", detail: "Explanations cite event IDs that the server checks against a canonical replay ledger. Provenance is verifiable, while every sentence still deserves scrutiny." },
  { term: "Keys stay on the server", detail: "Paid endpoints need server-side bearer authorisation. No token is shipped to, or stored in, the browser." },
  { term: "AI with a budget", detail: "Paid model attempts reserve against a shared Redis ledger and fail closed when it is unavailable. It is an attempt limiter, not a spending cap." },
];

function useActiveSection(ids: string[]) {
  const [active, setActive] = useState<string | null>(null);
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => { if (entry.isIntersecting) setActive(entry.target.id); });
    }, { rootMargin: "-45% 0px -50% 0px" });
    ids.forEach((id) => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, [ids]);
  return active;
}

const NAV_IDS = NAV.map((n) => n.id);

function LandingPage({ match }: LandingPageProps) {
  const sample = useSampleMoment(match);
  const model = useSampleModel(sample.features);
  const active = useActiveSection(NAV_IDS);
  const { scrollYProgress } = useScroll();
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 40, restDelta: 0.001 });

  return (
    <div className="lp">
      <a className="lp-skip" href="#lp-main">Skip to content</a>
      <header className="lp-header">
        <div className="lp-header-inner">
          <Brand href="#top" label="Matchwork home" />
          <nav className="lp-nav" aria-label="Landing page">
            {NAV.map((item) => (
              <a key={item.id} href={`#${item.id}`} aria-current={active === item.id ? "true" : undefined}>
                {active === item.id && <motion.span layoutId="lp-nav-thumb" className="lp-nav-thumb" transition={{ type: "spring", stiffness: 480, damping: 40 }} />}
                <span className="lp-nav-label">{item.label}</span>
              </a>
            ))}
          </nav>
          <div className="lp-header-end">
            <ThemeToggle />
            <a className="btn btn-primary lp-header-cta" href="#/studio">Open the studio</a>
          </div>
        </div>
        <motion.div className="lp-progress" style={{ scaleX: progress }} aria-hidden="true" />
      </header>

      <main id="lp-main">
        <Hero match={match} introTo={sample.time} />
        <Story match={match} sample={sample} model={model} />
        <Views match={match} sample={sample} model={model} />
        <Stack />
        <Repository />

        <section className="lp-section lp-transparency" id="transparency" aria-labelledby="transparency-title">
          <motion.div className="lp-section-head" {...reveal()}>
            <h2 id="transparency-title">Built to show its working.</h2>
            <p>An explanation is only useful if you know where it came from and where it stops.</p>
          </motion.div>
          <dl className="lp-principles">
            {PRINCIPLES.map((p, i) => (
              <motion.div key={p.term} initial={{ opacity: 0, y: 18 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.5 }} transition={{ duration: 0.6, ease: EASE_OUT, delay: (i % 2) * STAGGER }}>
                <dt>{p.term}</dt><dd>{p.detail}</dd>
              </motion.div>
            ))}
          </dl>
        </section>

        <motion.section className="lp-close" aria-labelledby="close-title" {...reveal(0, 32)}>
          <div>
            <h2 id="close-title">Don't just watch the game. Read it.</h2>
            <p>Choose from nine fictional fixtures, follow the action, and explore player statistics in Fan or Analyst view. No account needed.</p>
          </div>
          <a href="#/studio" className="btn btn-primary btn-lg">Open the match studio <ArrowRight aria-hidden="true" /></a>
        </motion.section>
      </main>

      <footer className="lp-footer">
        <div className="lp-notice" role="note" aria-label="Data notice">
          <ShieldCheck aria-hidden="true" />
          <p><strong>Synthetic data use only.</strong> Every team, player and match event in Matchwork is fictional and generated from a fixed seed. No real match data, broadcast footage or personal information is included.</p>
        </div>
        <div className="lp-footer-row">
          <span>Matchwork. The game, understood. Built for Inside the Game, the Microsoft × Premier League Developer Hackathon 2026.</span>
          <nav aria-label="Footer">
            <a href="https://github.com/Kanechiii/matchwork" target="_blank" rel="noreferrer">Repository</a>
            <a href="#/studio">Studio</a>
            <a href="#top">Back to top</a>
          </nav>
        </div>
      </footer>
    </div>
  );
}

export default LandingPage;
