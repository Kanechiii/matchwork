import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { BookOpen, Check, Copy, ExternalLink, FileText, Folder, FolderOpen } from "lucide-react";
import { Segmented } from "../components/Segmented";
import { EASE_OUT, STAGGER, reveal, swap } from "../motion";

const REPO = "https://github.com/Kanechiii/matchwork";
const tree = (path: string) => `${REPO}/tree/main/${path}`;
const blob = (path: string) => `${REPO}/blob/main/${path}`;

interface Entry { path: string; title: string; summary: string; files: { name: string; note: string }[] }

// Mirrors the repository layout on main.
const ENTRIES: Entry[] = [
  { path: "src", title: "Web app", summary: "React and TypeScript front end: the seeded match engine, rolling features, in-browser ONNX inference, explanations, the studio and this page.",
    files: [
      { name: "engine/generateEvents.ts", note: "Seeded, reproducible event generator" },
      { name: "engine/replay.ts", note: "Replay clock and frames" },
      { name: "engine/calculateStats.ts", note: "As-of match statistics" },
      { name: "ai/features.ts", note: "Rolling three-minute features" },
      { name: "ai/inference.ts", note: "ONNX Runtime Web loader" },
      { name: "ai/explanations.ts", note: "Fan and Analyst explanations" },
      { name: "services/matchworkAI.ts", note: "Insight API client" },
    ] },
  { path: "backend", title: "Insight API", summary: "FastAPI service that checks evidence against the replay ledger, calls Microsoft Foundry within budget and returns labelled fallbacks.",
    files: [
      { name: "main.py", note: "Routes and bearer authorisation" },
      { name: "trusted_evidence.py", note: "Ledger checksum and evidence checks" },
      { name: "foundry_service.py", note: "Foundry model calls" },
      { name: "multi_agent.py", note: "Specialist workflow and auditor" },
      { name: "agent_framework_adapter.py", note: "Agent Framework roles" },
      { name: "shared_budget.py", note: "Redis shared attempt ledger" },
      { name: "tests", note: "Unit tests for security, budget and agents" },
    ] },
  { path: "scripts", title: "Verification", summary: "Node checks that keep the replay, statistics, model and workflow honest, plus the replay export the backend trusts.",
    files: [
      { name: "exportReplay.mjs", note: "Exports the canonical replay ledger" },
      { name: "verifyReplay.mjs", note: "Replay clock and seeking" },
      { name: "verifyStats.mjs", note: "Statistics reconcile with events" },
      { name: "verifyIntelligence.mjs", note: "No future data in features or recaps" },
      { name: "verifyOnnxRuntime.mjs", note: "Model loads and answers" },
      { name: "train_match_state.py", note: "Rebuilds the synthetic classifier" },
    ] },
  { path: "docs", title: "Guides", summary: "Deployment evidence, release checklist, API security, Foundry workflow, evaluation and budget design, each separating verified from pending items.",
    files: [
      { name: "README.md", note: "Documentation index" },
      { name: "DEPLOYMENT_CURRENT.md", note: "Current Azure deployment" },
      { name: "RELEASE_CHECKLIST.md", note: "Submission gates and storyboard" },
      { name: "PHASE7B_API_SECURITY.md", note: "Protected API and trusted fixture" },
      { name: "FOUNDRY_MULTI_AGENT.md", note: "Two-agent workflow" },
      { name: "FOUNDRY_EVALUATION_OBSERVABILITY.md", note: "Evaluation and tracing" },
      { name: "PHASE7E_SHARED_BUDGET.md", note: "Shared Redis budget" },
    ] },
  { path: ".github/workflows", title: "Automation", summary: "GitHub Actions that run every quality check and publish the container image.",
    files: [
      { name: "quality.yml", note: "Build, lint, backend tests and verification" },
      { name: "publish-ghcr.yml", note: "Container image to GHCR" },
      { name: "pages.yml", note: "Static Pages build" },
    ] },
];

const QUICKSTART = {
  web: { label: "Web app", lines: ["git clone https://github.com/Kanechiii/matchwork.git", "cd matchwork", "npm ci", "npm run dev"] },
  api: { label: "Insight API", lines: ["python -m pip install -r backend/requirements.txt", "node scripts/exportReplay.mjs", "python -m uvicorn backend.main:app --host 127.0.0.1 --port 8000"] },
} as const;

function CopyButton({ text }: { text: string }) {
  const [state, setState] = useState<"idle" | "copied" | "failed">("idle");
  useEffect(() => {
    if (state === "idle") return;
    const t = window.setTimeout(() => setState("idle"), 1600);
    return () => window.clearTimeout(t);
  }, [state]);
  const copy = () => {
    if (!navigator.clipboard) { setState("failed"); return; }
    navigator.clipboard.writeText(text).then(() => setState("copied"), () => setState("failed"));
  };
  return (
    <button type="button" className="btn btn-secondary btn-sm lp-copy" onClick={copy} aria-live="polite">
      <AnimatePresence mode="wait" initial={false}>
        <motion.span key={state} style={{ display: "grid" }} initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.6, opacity: 0 }} transition={{ type: "spring", stiffness: 500, damping: 26 }}>
          {state === "copied" ? <Check aria-hidden="true" /> : <Copy aria-hidden="true" />}
        </motion.span>
      </AnimatePresence>
      {state === "copied" ? "Copied" : state === "failed" ? "Copy unavailable" : "Copy"}
    </button>
  );
}

export function Repository() {
  const [selected, setSelected] = useState(ENTRIES[0].path);
  const [qs, setQs] = useState<keyof typeof QUICKSTART>("web");
  const entry = ENTRIES.find((e) => e.path === selected) ?? ENTRIES[0];
  const commands = QUICKSTART[qs].lines.join("\n");

  return (
    <section className="lp-section lp-repo" id="repository" aria-labelledby="repo-title">
      <motion.div className="lp-section-head" {...reveal()}>
        <div>
          <h2 id="repo-title">Explore the repository.</h2>
          <div className="lp-repo-links">
            <a className="btn btn-primary" href={REPO} target="_blank" rel="noreferrer">View on GitHub <ExternalLink aria-hidden="true" /></a>
            <a className="btn btn-secondary" href={blob("docs/README.md")} target="_blank" rel="noreferrer"><BookOpen aria-hidden="true" /> Documentation</a>
          </div>
        </div>
        <p>Everything behind the insight system is open: the match engine, the in-browser model, the protected API, the checks that keep it honest and the guides that document what is verified.</p>
      </motion.div>

      <div className="lp-repo-grid">
        <motion.div className="lp-explorer" {...reveal(0.05)}>
          <div className="lp-explorer-head"><span>Kanechiii / matchwork</span><span>main</span></div>
          <div className="lp-explorer-body">
            <ul className="lp-tree" role="list" aria-label="Repository folders">
              {ENTRIES.map((e) => {
                const active = e.path === selected;
                return (
                  <li key={e.path}>
                    <button type="button" aria-pressed={active} onClick={() => setSelected(e.path)}>
                      {active && <motion.span layoutId="repo-thumb" className="lp-tree-thumb" transition={{ type: "spring", stiffness: 480, damping: 38 }} />}
                      <span className="lp-tree-row">
                        {active ? <FolderOpen aria-hidden="true" /> : <Folder aria-hidden="true" />}
                        <span className="lp-tree-path">{e.path}/</span>
                        <span className="lp-tree-title">{e.title}</span>
                      </span>
                    </button>
                  </li>
                );
              })}
              <li className="lp-tree-files">
                {["README.md", "Dockerfile", "PHASE7_COST_GUARD.md"].map((f) => (
                  <a key={f} href={blob(f)} target="_blank" rel="noreferrer"><FileText aria-hidden="true" />{f}</a>
                ))}
              </li>
            </ul>
            <div className="lp-explorer-detail" aria-live="polite">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div key={entry.path} {...swap}>
                  <div className="lp-explorer-title"><h3>{entry.title}</h3><code>{entry.path}/</code></div>
                  <p>{entry.summary}</p>
                  <ul className="lp-file-list">
                    {entry.files.map((file, i) => (
                      <motion.li key={file.name} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, ease: EASE_OUT, delay: 0.08 + i * STAGGER * 0.5 }}>
                        <a href={file.name === "tests" ? tree(`${entry.path}/tests`) : blob(`${entry.path}/${file.name}`)} target="_blank" rel="noreferrer">
                          <code>{file.name}</code><span>{file.note}</span>
                        </a>
                      </motion.li>
                    ))}
                  </ul>
                  <a className="lp-inline-link" href={tree(entry.path)} target="_blank" rel="noreferrer">Open {entry.path}/ on GitHub <ExternalLink aria-hidden="true" /></a>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

        <motion.div className="lp-quickstart" {...reveal(0.12)}>
          <div className="lp-quickstart-head">
            <h3>Run it locally</h3>
            <Segmented id="lp-qs" label="Quick start target" size="sm" value={qs} onChange={setQs}
              options={(Object.keys(QUICKSTART) as (keyof typeof QUICKSTART)[]).map((k) => ({ value: k, label: QUICKSTART[k].label }))} />
          </div>
          <div className="lp-code">
            <AnimatePresence mode="wait" initial={false}>
              <motion.pre key={qs} {...swap}><code>{QUICKSTART[qs].lines.map((line) => <span key={line}><i aria-hidden="true">$</i>{line}{"\n"}</span>)}</code></motion.pre>
            </AnimatePresence>
            <CopyButton text={commands} />
          </div>
          <p className="lp-quickstart-note">Requires Node.js 24, npm and Python 3.12+. The replay and rules-based recap work without paid AI credentials; keep <code>MATCHWORK_AI_ENABLED=false</code> until server-side safeguards are configured.</p>
        </motion.div>
      </div>
    </section>
  );
}
