import { useRef, useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { Activity, Container, Cpu, Database, GitBranch, MessageSquareText, Plus, Workflow } from "lucide-react";
import { EASE_IN, EASE_OUT, reveal } from "../motion";

interface Product {
  name: string;
  icon: ComponentType<{ "aria-hidden"?: boolean | "true" }>;
  status: string;
  purpose: string;
  detail: string;
  limit: string;
}

// Facts from the README and docs/. Each card keeps its limit next to its claim.
const GROUPS: { title: string; note: string; tone: "ai" | "platform"; products: Product[] }[] = [
  {
    title: "AI that explains the game", note: "Where the insight comes from", tone: "ai",
    products: [
      { name: "Microsoft Foundry", icon: MessageSquareText, status: "Server-side · opt-in", purpose: "Writes Fan and Analyst explanations from verified match evidence.",
        detail: "When you pause, the protected API can ask a Foundry model to explain the moment for your audience. It only sees evidence the server has verified, and answers cite event IDs. Otherwise a labelled rules-based fallback is returned.",
        limit: "A recap on screen alone does not prove a live model call ran." },
      { name: "Microsoft Agent Framework", icon: Workflow, status: "Opt-in · off by default", purpose: "Coordinates a two-agent explanation workflow.",
        detail: "A Tactical Analyst agent proposes an observation, a Narrative Agent writes it for fans or analysts, and a local Evidence Auditor checks citations at every handoff, failing closed if any are out of scope.",
        limit: "Off by default; the public UI does not call it." },
      { name: "ONNX Runtime Web", icon: Cpu, status: "Runs in your browser", purpose: "Classifies each spell as control, pressure or transition.",
        detail: "An embedded classifier runs on WebAssembly through a version-pinned onnxruntime-web build, reading seven rolling three-minute features every 15 seconds of match time. No server call is needed.",
        limit: "Trained on synthetic prototypes; scores are illustrative." },
    ],
  },
  {
    title: "Platform that runs it", note: "Hosting, budget, telemetry and delivery", tone: "platform",
    products: [
      { name: "Azure Container Apps", icon: Container, status: "Hosts the secure demo", purpose: "Runs the insight API and the web app.",
        detail: "One two-stage Docker image serves the web app and the Python API in Japan East, inside a private virtual network. Tokens arrive as secret references, never baked into the image.",
        limit: "A verified hackathon deployment, not a production SLA." },
      { name: "Azure Managed Redis", icon: Database, status: "On the secure demo", purpose: "Shares the paid AI attempt budget across replicas.",
        detail: "Every paid model call first reserves an hourly and daily attempt with an atomic script over a private TLS endpoint. If Redis is unreachable, AI calls fail closed into the fallback.",
        limit: "Limits this app's attempts; not a hard billing cap." },
      { name: "Azure Monitor Application Insights", icon: Activity, status: "Optional · off by default", purpose: "Traces each specialist agent step.",
        detail: "When enabled, OpenTelemetry spans for each specialist agent are exported at 10% sampling. Prompts, responses, match details and credentials are never attached.",
        limit: "Off unless tracing is switched on; check monitoring cost first." },
      { name: "GitHub Actions and GHCR", icon: GitBranch, status: "Builds and ships", purpose: "Checks every change and publishes the container image.",
        detail: "The quality workflow builds and lints the app and runs replay, statistics, ONNX, enterprise and workflow checks plus backend tests. A publish workflow pushes the image to GitHub Container Registry.",
        limit: "Passing CI proves the checks, not production behaviour." },
    ],
  },
];

const CLOSED = "inset(100% 0% 0% 0% round 12px)";
const OPEN = "inset(0% 0% 0% 0% round 12px)";

function ProductCard({ product, index }: { product: Product; index: number }) {
  const [open, setOpen] = useState(false);
  const pointer = useRef<string>("mouse");
  const Icon = product.icon;
  return (
    <motion.article
      className={`lp-product${open ? " is-open" : ""}`}
      tabIndex={0}
      aria-label={`${product.name}. ${product.purpose}`}
      initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.6, ease: EASE_OUT, delay: index * 0.06 }}
      onPointerDown={(e) => { pointer.current = e.pointerType; }}
      onPointerEnter={(e) => { if (e.pointerType === "mouse") setOpen(true); }}
      onPointerLeave={(e) => { if (e.pointerType === "mouse") setOpen(false); }}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      onClick={() => { if (pointer.current !== "mouse") setOpen((v) => !v); }}
      onKeyDown={(e) => { if (e.key === "Escape") setOpen(false); }}
    >
      <div className="lp-product-face">
        <div className="lp-product-top">
          <span className="lp-product-icon"><Icon aria-hidden="true" /></span>
          <span className="lp-product-status">{product.status}</span>
        </div>
        <h4>{product.name}</h4>
        <p>{product.purpose}</p>
        <span className="lp-product-hint" aria-hidden="true">
          <motion.span animate={{ rotate: open ? 45 : 0 }} transition={{ type: "spring", stiffness: 400, damping: 22 }} style={{ display: "grid" }}><Plus /></motion.span>
          Full description
        </span>
      </div>
      <motion.div className="lp-product-detail"
        initial={false}
        animate={{ clipPath: open ? OPEN : CLOSED }}
        transition={open ? { duration: 0.5, ease: EASE_OUT } : { duration: 0.26, ease: EASE_IN }}>
        <motion.div initial={false} animate={open ? "open" : "closed"} variants={{ open: { transition: { staggerChildren: 0.05, delayChildren: 0.12 } }, closed: {} }}>
          {[
            <h4 key="h">{product.name}</h4>,
            <p key="d">{product.detail}</p>,
            <p key="l" className="lp-product-limit"><strong>Limit:</strong> {product.limit}</p>,
          ].map((node) => (
            <motion.div key={node.key} variants={{ open: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT } }, closed: { opacity: 0, y: 8, transition: { duration: 0.12 } } }}>
              {node}
            </motion.div>
          ))}
        </motion.div>
      </motion.div>
    </motion.article>
  );
}

export function Stack() {
  return (
    <section className="lp-section lp-stack" id="stack" aria-labelledby="stack-title">
      <motion.div className="lp-section-head" {...reveal()}>
        <h2 id="stack-title">Built on Microsoft.</h2>
        <p>The products that power the insight system and what each one is for. Hover, focus or tap a card for the full description and its limits.</p>
      </motion.div>
      {GROUPS.map((group) => (
        <div key={group.title} className={`lp-stack-group is-${group.tone}`}>
          <motion.div className="lp-stack-group-head" {...reveal(0, 12)}>
            <h3>{group.title}</h3><span>{group.note}</span>
          </motion.div>
          <div className="lp-product-grid">
            {group.products.map((product, i) => <ProductCard key={product.name} product={product} index={i} />)}
          </div>
        </div>
      ))}
    </section>
  );
}
