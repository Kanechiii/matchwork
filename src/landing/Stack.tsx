import { ScrollHeading } from "./ScrollMotion";
import { useRef, useState, type ComponentType } from "react";
import { motion } from "motion/react";
import { Activity, Cloud, Container, Cpu, Database, GitBranch, Globe, LockKeyhole, MessageSquareText, Plus, Wallet, Workflow } from "lucide-react";
import { EASE_IN, EASE_OUT, reveal } from "../motion";

interface Product {
  name: string;
  icon: ComponentType<{ "aria-hidden"?: boolean | "true" }>;
  status: string;
  purpose: string;
  detail: string;
}

// Project roles are grounded in the actual frontend, backend, CI and Azure deployment docs.
// The descriptions distinguish deployed services from optional integrations.
const GROUPS: { title: string; note: string; tone: "ai" | "platform" | "delivery"; products: Product[] }[] = [
  {
    title: "Microsoft AI & intelligence",
    note: "Interpret the match and explain what happened",
    tone: "ai",
    products: [
      {
        name: "Microsoft Foundry / Azure OpenAI",
        icon: MessageSquareText,
        status: "Protected API · opt-in",
        purpose: "Generate Fan and Analyst narratives from server-verified synthetic match evidence.",
        detail: "The FastAPI service sends approved event IDs and match context to an Azure OpenAI-compatible Foundry endpoint. Responses reference observed evidence; when paid inference is disabled or unavailable, the app uses a labelled rules-based fallback."
      },
      {
        name: "Microsoft Agent Framework",
        icon: Workflow,
        status: "Implemented · opt-in",
        purpose: "Coordinate specialist agents for more structured match explanations.",
        detail: "A Tactical Analyst examines the trusted event context, then a Narrative Agent writes for the selected audience. A local Evidence Auditor verifies cited IDs at handoffs. The specialist path is disabled by default and is not called by the ordinary public studio."
      },
      {
        name: "ONNX Runtime Web",
        icon: Cpu,
        status: "Active · browser-side",
        purpose: "Identify control, pressure and transition during the replay without a paid API call.",
        detail: "A synthetic-trained ONNX classifier runs in the browser using WebAssembly. It samples seven features from a rolling three-minute window every 15 seconds of replay time and exposes its evidence and model availability to analysts."
      },
    ],
  },
  {
    title: "Azure services & infrastructure",
    note: "Host the demo, secure connectivity and manage AI costs",
    tone: "platform",
    products: [
      {
        name: "Azure Container Apps",
        icon: Container,
        status: "Deployed · Japan East",
        purpose: "Host the public Matchwork web app and its protected Python insight API.",
        detail: "The secure demo runs a container with the built React site and FastAPI backend. The Container Apps environment connects to the project's Azure virtual network, while Redis credentials and other sensitive configuration use secret references."
      },
      {
        name: "Azure Managed Redis",
        icon: Database,
        status: "Deployed · private TLS",
        purpose: "Coordinate a shared hourly and daily allowance for paid Foundry requests.",
        detail: "The backend reserves model-call attempts atomically in a Redis Cluster ledger, including when several app instances share the same budget. If the ledger is unavailable, paid inference fails closed to the deterministic fallback."
      },
      {
        name: "Azure Virtual Network",
        icon: Globe,
        status: "Deployed · secure networking",
        purpose: "Provide private network connectivity between Container Apps and the Redis service.",
        detail: "Matchwork's secure deployment uses a dedicated virtual network and Container Apps subnet in Japan East. The app can reach Redis through the private network while the web experience remains accessible through the designated public endpoint."
      },
      {
        name: "Azure Private Link",
        icon: LockKeyhole,
        status: "Deployed · Redis endpoint",
        purpose: "Connect to the shared budget database through a private endpoint.",
        detail: "Redis resolves to a private endpoint rather than requiring a public Redis connection. Cluster-aware address remapping preserves the service hostname and TLS certificate checks when the Redis cluster advertises its shard addresses."
      },
      {
        name: "Azure Cost Management + Budgets",
        icon: Wallet,
        status: "Budget monitoring",
        purpose: "Track Azure spending and alert on costs related to the demonstration.",
        detail: "Azure budget alerts provide spending visibility for the hosted app and paid AI services. Matchwork separately uses Redis attempt reservations, model quotas and a configurable AI kill switch; budget alerts themselves do not disable requests."
      },
      {
        name: "Azure Monitor / Application Insights",
        icon: Activity,
        status: "Optional · off by default",
        purpose: "Observe specialist-agent handoffs when diagnostic tracing is enabled.",
        detail: "The backend can export sampled OpenTelemetry spans to Application Insights using a separately configured connection string. Tracing uses 10% sampling and omits prompts, full responses, match event details and credentials."
      },
    ],
  },
  {
    title: "Build, registry & preview",
    note: "Versioned delivery and reproducible verification",
    tone: "delivery",
    products: [
      {
        name: "GitHub Actions + Container Registry",
        icon: GitBranch,
        status: "Active · CI and image publishing",
        purpose: "Verify changes and package the application for Azure deployment.",
        detail: "GitHub Actions builds and lints the frontend, checks the replay, player statistics, ONNX model and backend, and validates release safeguards. A separate manual publishing workflow builds the container image and pushes it to GitHub Container Registry."
      },
      {
        name: "GitHub Pages",
        icon: Cloud,
        status: "Manual static preview",
        purpose: "Publish a browser-only preview separately from the secure API deployment.",
        detail: "A manually triggered workflow builds the frontend with /matchwork/ asset paths and deploys the static result. The preview demonstrates the replay and browser-side intelligence; the secured FastAPI endpoints remain hosted separately in Azure Container Apps."
      },
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
        <span className="lp-product-purpose-label">Purpose in Matchwork</span>
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
            <span key="label" className="lp-product-detail-label">How it is used</span>,
            <p key="d">{product.detail}</p>,
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
        <ScrollHeading id="stack-title" text="The technology behind Matchwork." />
        <p>See the specific role each Microsoft AI product, Azure service and delivery tool plays in the project. Open a card for the implementation details; optional integrations are clearly marked.</p>
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
