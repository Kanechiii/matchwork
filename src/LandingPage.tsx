import { useEffect, useState } from "react";
import type { SyntheticMatch } from "./types/match";
import "./LandingPage.css";

interface LandingPageProps {
  match: SyntheticMatch;
}

function PitchPreview({ match }: LandingPageProps) {
  const recentSample = match.events.slice(0, 7);
  const home = match.metadata.homeTeam;
  return (
    <div className="lp-pitch-card">
      <div className="lp-pitch-top"><span className="lp-live-indicator" /> A CLOSER LOOK AT THE GAME <span>01 / THE PITCH</span></div>
      <div className="lp-pitch-stage">
        <svg viewBox="0 0 600 370" role="img" aria-label="A football pitch with locations of real events from the fictional demonstration match" className="lp-pitch-svg">
          <defs>
            <pattern id="lp-stripes" width="90" height="370" patternUnits="userSpaceOnUse"><rect width="45" height="370" fill="#b7ed883b" /></pattern>
          </defs>
          <rect width="600" height="370" fill="#17352e" rx="12" />
          <rect x="0" y="0" width="600" height="370" fill="url(#lp-stripes)" opacity=".4" rx="12"/>
          <g fill="none" stroke="#bcdfc1" strokeWidth="2" opacity=".46"><rect x="18" y="18" width="564" height="334" rx="2" /><path d="M300 18V352"/><circle cx="300" cy="185" r="64"/><circle cx="300" cy="185" r="3" fill="#bcdfc1"/><path d="M18 97H120V273H18 M582 97H480V273H582 M18 142H65V228H18 M582 142H535V228H582"/><path d="M150 138A55 55 0 0 1 150 232 M450 138A55 55 0 0 0 450 232" /></g>
          {recentSample.map((event, i) => (
            <g key={event.id}>
              <circle cx={18 + event.x * 5.64} cy={18 + event.y * 3.34} r={i===recentSample.length-1 ? 13 : 8} fill={event.teamId===home.id ? "#82baff" : "#ffae94"} fillOpacity={i===recentSample.length-1 ? 1 : .7} stroke="#dffada" strokeWidth={i===recentSample.length-1 ? 3 : 1.5}/>
              {i===recentSample.length-1 && <circle cx={18 + event.x * 5.64} cy={18 + event.y * 3.34} r="23" fill="none" stroke="#c4fc94" strokeWidth="2" className="lp-event-ring"/>}
            </g>
          ))}
        </svg>
        <div className="lp-pitch-callout"><span className="lp-pitch-badge">EVENTS, NOT GUESSWORK</span><strong>See where the action happens.</strong><small>Sample positions from our fictional match.</small></div>
      </div>
      <div className="lp-pitch-bottom"><span><i className="lp-dot lp-home-dot" /> {match.metadata.homeTeam.abbreviation}</span><span><i className="lp-dot lp-away-dot" /> {match.metadata.awayTeam.abbreviation}</span><span>BASED ON RECORDED EVENTS</span></div>
    </div>
  );
}

function LandingPage({ match }: LandingPageProps) {
  const [activeSection, setActiveSection] = useState("");
  const [headerScrolled, setHeaderScrolled] = useState(false);

  useEffect(() => {
    const sectionIds = ["lp-story", "lp-how", "lp-views"];
    let frame = 0;

    const updateFromScroll = () => {
      frame = 0;
      setHeaderScrolled(window.scrollY > 20);
      let visible = "";
      for (const id of sectionIds) {
        const section = document.getElementById(id);
        if (section && section.getBoundingClientRect().top <= 175) {
          visible = id;
        }
      }
      setActiveSection((current) => current === visible ? current : visible);
    };

    const onScroll = () => {
      if (!frame) frame = window.requestAnimationFrame(updateFromScroll);
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    onScroll();
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      window.cancelAnimationFrame(frame);
    };
  }, []);

  useEffect(() => {
    const sections = document.querySelectorAll<HTMLElement>(".lp-reveal");
    if (!("IntersectionObserver" in window) || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      sections.forEach((section) => section.classList.add("lp-visible"));
      return;
    }
    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("lp-visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: "0px 0px -35px 0px" });
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, []);
  return (
    <main className="lp-page">
      <a className="lp-skip" href="#lp-story">Skip to the story</a>
      <header className={`lp-header${headerScrolled ? " lp-header-scrolled" : ""}`}>
        <a className="lp-logo" href="#top" aria-label="Matchwork home"><span className="lp-logo-mark">◆</span> MATCHWORK<span>.</span></a>
        <nav className="lp-nav" aria-label="Explore Matchwork">
          <a href="#lp-story" aria-current={activeSection === "lp-story" ? "location" : undefined}>The idea</a>
          <a href="#lp-how" aria-current={activeSection === "lp-how" ? "location" : undefined}>How it works</a>
          <a href="#lp-views" aria-current={activeSection === "lp-views" ? "location" : undefined}>Who it's for</a>
        </nav>
        <a className="lp-nav-cta" href="#/studio">Open the studio <span aria-hidden="true">↗</span></a>
      </header>

      <section className="lp-hero" id="top">
        <div className="lp-hero-copy">
          <div className="lp-eyebrow"><span /> INSIDE THE GAME <i /> A NEW WAY TO WATCH</div>
          <h1>Football moves fast.<br/><em>Understanding it</em><br/>shouldn’t.</h1>
          <p>The final score is only part of the story. Follow every turning point, see why it matters, and explore the game at your own pace.</p>
          <div className="lp-hero-actions"><a href="#/studio" className="lp-primary-cta">Explore the match <span aria-hidden="true">↗</span></a><a href="#lp-story" className="lp-text-cta">Discover the idea <span aria-hidden="true">↓</span></a></div>
          <div className="lp-hero-foot"><span className="lp-foot-mark">01—03</span><span>ONE FICTIONAL MATCH.<br/>A WHOLE NEW PERSPECTIVE.</span><span className="lp-scroll-cue" aria-hidden="true">SCROLL TO EXPLORE ↓</span></div>
        </div>
        <PitchPreview match={match}/>
      </section>

      <section className="lp-intro lp-reveal" id="lp-story">
        <div className="lp-section-number">01 / THE BIGGER PICTURE</div>
        <div><p className="lp-intro-super">More than a scoreline.</p><h2>The moments between the goals <em>are the game.</em></h2></div>
        <p>A completed pass. A sudden turnover. Pressure building toward the box. Matchwork brings those small moments into focus—so you can see the match take shape.</p>
      </section>

      <section className="lp-feature lp-feature-one lp-reveal" id="lp-how">
        <div className="lp-feature-copy"><span className="lp-chapter">02 / FOLLOW THE ACTION</span><h2>Rewind a moment.<br/><em>Find the meaning.</em></h2><p>Move through a 90-minute match, pause wherever you like, and watch the story and statistics follow your position. It's the match on your terms.</p><a href="#/studio" className="lp-inline-cta">Try the replay <span aria-hidden="true">↗</span></a></div>
        <div className="lp-showcase lp-timeline-showcase" aria-label="Illustration of the replay timeline">
          <div className="lp-showcase-top"><span>THE MATCH IS IN YOUR HANDS</span><span className="lp-showcase-tag">REPLAY</span></div>
          <div className="lp-showcase-bigtime">24<span>:</span>18</div>
          <div className="lp-showcase-progress"><span /></div>
          <div className="lp-showcase-times"><span>KICK OFF</span><span>HALF TIME</span><span>FULL TIME</span></div>
          <div className="lp-showcase-play"><span>▶</span> Pause. Play. Explore.</div>
          <small>Illustrative replay controls; actual interactions are in the studio.</small>
        </div>
      </section>

      <section className="lp-feature lp-feature-two lp-reveal" id="lp-views">
        <div className="lp-view-showcase">
          <div className="lp-view-card lp-view-card-fan"><span className="lp-view-label">FOR THE FAN</span><span className="lp-view-icon">✳</span><h3>What's happening?</h3><p>Pressure is rising. The action is moving forward.</p><div className="lp-view-bottom">THE STORY, MADE SIMPLE <span>↗</span></div></div>
          <div className="lp-view-card lp-view-card-analyst"><span className="lp-view-label">FOR THE ANALYST</span><div className="lp-mini-bars"><span style={{width:"74%"}}/><span style={{width:"46%"}}/><span style={{width:"61%"}}/></div><h3>Show me the evidence.</h3><p>Event timing, match statistics, and transparent model details.</p><div className="lp-view-bottom">THE DETAIL BEHIND THE PLAY <span>↗</span></div></div>
        </div>
        <div className="lp-feature-copy"><span className="lp-chapter">03 / YOUR WAY INTO THE GAME</span><h2>Curious fan?<br/><em>Deep thinker?</em><br/>There's a view for you.</h2><p>Fan view keeps the game human. Analyst view opens up the evidence behind the insights. Switch whenever you want—without losing your place.</p><a href="#/studio" className="lp-inline-cta">Find your view <span aria-hidden="true">↗</span></a></div>
      </section>

      <section className="lp-close lp-reveal">
        <div className="lp-close-grid" aria-hidden="true"/>
        <span className="lp-chapter">READY TO SEE THE GAME DIFFERENTLY?</span>
        <h2>Don't just watch<br/><em>the game.</em> Read it.</h2>
        <p>One fictional match. Every moment in your hands. No account needed.</p>
        <a href="#/studio" className="lp-primary-cta">Enter Matchwork Studio <span aria-hidden="true">↗</span></a>
      </section>
      <footer className="lp-footer"><span>MATCHWORK<span className="lp-footer-period">.</span> / THE GAME, UNDERSTOOD.</span><span>Demonstration with fictional teams and synthetic events. No live match data.</span><a href="#top">BACK TO TOP ↑</a></footer>
    </main>
  );
}

export default LandingPage;
