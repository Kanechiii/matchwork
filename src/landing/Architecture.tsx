import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { EASE_OUT, STAGGER, reveal, swap } from "../motion";

interface Node { id: string; name: string; tag: string; detail: string; caveat: string }
interface Lane { title: string; place: string; nodes: Node[] }

// Facts from the README and docs/. Caveats are kept with each claim on purpose.
const LANES: Lane[] = [
  {
    title: "In your browser", place: "React · TypeScript · Vite",
    nodes: [
      { id: "replay", name: "Replay engine", tag: "Deterministic", detail: "Generates the fictional match from a fixed seed and computes score, statistics and rolling features as of the replay clock.", caveat: "Reproducible is not the same as realistic. These are synthetic events." },
      { id: "onnx", name: "ONNX Runtime Web", tag: "WASM", detail: "Runs the embedded match-state classifier in WebAssembly, loaded from a version-pinned onnxruntime-web build.", caveat: "Trained on synthetic prototypes. Scores are not calibrated predictions." },
      { id: "studio", name: "Fan and Analyst studio", tag: "UI", detail: "Synchronised replay, event feed, statistics and explanations for two audiences.", caveat: "Always labels whether an explanation came from Foundry or the rules-based fallback." },
    ],
  },
  {
    title: "Protected API", place: "FastAPI · Azure Container Apps, Japan East",
    nodes: [
      { id: "api", name: "Insight endpoints", tag: "Bearer auth", detail: "POST /api/insights and /api/agents/insights require server-side bearer authorisation. GET /health stays public.", caveat: "The token lives only on the server and is never embedded in browser code." },
      { id: "ledger", name: "Trusted evidence ledger", tag: "SHA-256", detail: "The server loads the exported seeded replay, verifies its checksum and rejects unknown, fabricated or future event IDs before any model call.", caveat: "Valid IDs prove provenance, not that every generated sentence is correct." },
    ],
  },
  {
    title: "Azure AI and data", place: "Opt-in, fail-closed",
    nodes: [
      { id: "foundry", name: "Microsoft Foundry", tag: "Model inference", detail: "Writes Fan or Analyst explanations from verified evidence. When disabled, unavailable or over budget, the API returns an explicit rules-based fallback.", caveat: "A recap on screen does not, by itself, prove a live model call ran." },
      { id: "agents", name: "Specialist agents", tag: "Agent Framework", detail: "A Tactical Analyst and a Narrative Agent with a local Evidence Auditor that checks citations at each handoff.", caveat: "Off by default. Its presence in the repository does not mean the public UI uses it." },
      { id: "redis", name: "Azure Managed Redis", tag: "Shared budget", detail: "An atomic attempt ledger over a private TLS endpoint counts paid model attempts per hour and per day, and fails closed when unavailable.", caveat: "It limits this app's attempts. It is not a hard billing cap." },
    ],
  },
];

const ALL = LANES.flatMap((lane) => lane.nodes);

export function Architecture() {
  const [selected, setSelected] = useState("onnx");
  const node = ALL.find((n) => n.id === selected) ?? ALL[0];

  return (
    <section className="lp-section lp-arch" id="architecture" aria-labelledby="arch-title">
      <motion.div className="lp-section-head" {...reveal()}>
        <h2 id="arch-title">Under the hood.</h2>
        <p>Select any part of the system to see what it does and where its limits are.</p>
      </motion.div>
      <div className="lp-arch-map">
        {LANES.map((lane, li) => (
          <motion.div key={lane.title} className="lp-lane" {...reveal(li * 0.12)}>
            <div className="lp-lane-head"><h3>{lane.title}</h3><span>{lane.place}</span></div>
            <ul>
              {lane.nodes.map((n, ni) => (
                <motion.li key={n.id} initial={{ opacity: 0, y: 12 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.5, ease: EASE_OUT, delay: li * 0.12 + ni * STAGGER }}>
                  <button type="button" className="lp-node" aria-pressed={selected === n.id} onClick={() => setSelected(n.id)}>
                    {selected === n.id && <motion.span layoutId="arch-node" className="lp-node-thumb" transition={{ type: "spring", stiffness: 420, damping: 38 }} />}
                    <span className="lp-node-name">{n.name}</span>
                    <span className="lp-node-tag">{n.tag}</span>
                  </button>
                </motion.li>
              ))}
            </ul>
            {li < LANES.length - 1 && (
              <motion.span className="lp-lane-link" aria-hidden="true" initial={{ scaleX: 0 }} whileInView={{ scaleX: 1 }} viewport={{ once: true, amount: 0.6 }} transition={{ duration: 0.7, ease: EASE_OUT, delay: 0.3 + li * 0.15 }} />
            )}
          </motion.div>
        ))}
      </div>
      <div className="lp-arch-detail" aria-live="polite">
        <AnimatePresence mode="wait" initial={false}>
          <motion.div key={node.id} {...swap}>
            <div className="lp-arch-detail-head"><h3>{node.name}</h3><span className="lp-node-tag">{node.tag}</span></div>
            <p>{node.detail}</p>
            <p className="lp-arch-caveat"><strong>Limit:</strong> {node.caveat}</p>
          </motion.div>
        </AnimatePresence>
      </div>
      <motion.p className="lp-delivery" {...reveal(0.1, 12)}>
        <span>Delivery</span> GitHub Actions quality checks <i aria-hidden="true" /> container image on GHCR <i aria-hidden="true" /> Azure Container Apps in a private virtual network
      </motion.p>
    </section>
  );
}
