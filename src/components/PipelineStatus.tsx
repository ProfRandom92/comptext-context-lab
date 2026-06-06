import { Terminal, FileJson, ShieldCheck, Bot, FileCheck2, ClipboardCheck, Check, X, Loader2, Minus } from "lucide-react";
import { type ComponentType } from "react";

export type StageState = "done" | "pending" | "blocked" | "skipped" | "running";

export type RunStage = {
  key: "inspect" | "pack" | "gate" | "provider" | "proposal" | "review";
  label: string;
  state: StageState;
  detail?: string;
  icon: ComponentType<{ className?: string }>;
};

export type RunSnapshot = {
  packExists: boolean;
  packSha?: string | null;
  fileCount?: number;
  gateStatus?: string | null;
  gateReason?: string | null;
  proposalCount: number;
  latestProposal?: { valid: boolean; provider: string; error?: string | null } | null;
  latestReview?: { status: string; notes?: string | null } | null;
};

export function deriveStages(s: RunSnapshot): RunStage[] {
  // 1. Inspect
  const inspect: RunStage = {
    key: "inspect",
    label: "Inspect",
    icon: Terminal,
    state: s.packExists ? "done" : "pending",
    detail: s.packExists ? "tree fetched" : "awaiting repo",
  };
  // 2. Pack
  const pack: RunStage = {
    key: "pack",
    label: "Context Pack",
    icon: FileJson,
    state: s.packSha ? "done" : s.packExists ? "running" : "pending",
    detail: s.packSha ? `${s.fileCount ?? 0} files · ${s.packSha.slice(0, 8)}` : "hashing…",
  };
  // 3. Policy Gate
  const gateState: StageState =
    s.gateStatus === "pass" ? "done" : s.gateStatus === "blocked" ? "blocked" : s.packExists ? "running" : "pending";
  const gate: RunStage = {
    key: "gate",
    label: "Policy Gate",
    icon: ShieldCheck,
    state: gateState,
    detail: s.gateReason ?? (s.gateStatus === "pass" ? "passed" : "evaluating"),
  };
  // 4. Provider
  const providerState: StageState =
    gateState === "blocked" ? "skipped" : s.proposalCount > 0 ? "done" : "pending";
  const provider: RunStage = {
    key: "provider",
    label: "Provider",
    icon: Bot,
    state: providerState,
    detail:
      gateState === "blocked"
        ? "gate blocked"
        : s.proposalCount > 0
          ? `${s.proposalCount} call${s.proposalCount === 1 ? "" : "s"}`
          : "no calls yet",
  };
  // 5. Proposal
  const proposalState: StageState =
    providerState === "skipped"
      ? "skipped"
      : s.latestProposal
        ? s.latestProposal.valid
          ? "done"
          : "blocked"
        : "pending";
  const proposal: RunStage = {
    key: "proposal",
    label: "Proposal",
    icon: FileCheck2,
    state: proposalState,
    detail: s.latestProposal
      ? s.latestProposal.valid
        ? `${s.latestProposal.provider} · valid`
        : s.latestProposal.error?.slice(0, 40) ?? "invalid output"
      : "awaiting model",
  };
  // 6. Review
  const reviewState: StageState =
    proposalState === "skipped" || proposalState === "pending"
      ? proposalState
      : s.latestReview
        ? s.latestReview.status === "blocked"
          ? "blocked"
          : "done"
        : "pending";
  const review: RunStage = {
    key: "review",
    label: "Review",
    icon: ClipboardCheck,
    state: reviewState,
    detail: s.latestReview ? `${s.latestReview.status}` : "needs your sign-off",
  };
  return [inspect, pack, gate, provider, proposal, review];
}

function StateGlyph({ state }: { state: StageState }) {
  const cls: Record<StageState, string> = {
    done: "bg-pass/20 text-pass border-pass/40",
    pending: "bg-muted text-muted-foreground border-border",
    running: "bg-primary/15 text-primary border-primary/40",
    blocked: "bg-blocked/20 text-blocked border-blocked/40",
    skipped: "bg-muted/40 text-muted-foreground border-border",
  };
  const Icon = state === "done" ? Check : state === "blocked" ? X : state === "running" ? Loader2 : Minus;
  return (
    <span className={`inline-flex size-5 items-center justify-center rounded-full border ${cls[state]}`}>
      <Icon className={`size-3 ${state === "running" ? "animate-spin" : ""}`} />
    </span>
  );
}

export function PipelineStatus({ snapshot, compact = false }: { snapshot: RunSnapshot; compact?: boolean }) {
  const stages = deriveStages(snapshot);
  if (compact) {
    return (
      <div className="flex items-center gap-1">
        {stages.map((s, i) => (
          <div key={s.key} className="flex items-center gap-1">
            <StateGlyph state={s.state} />
            {i < stages.length - 1 && <span className="h-px w-3 bg-border" />}
          </div>
        ))}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {stages.map((s, i) => {
        const Icon = s.icon;
        const tone =
          s.state === "done"
            ? "border-pass/40"
            : s.state === "blocked"
              ? "border-blocked/40"
              : s.state === "running"
                ? "border-primary/40"
                : "border-border";
        return (
          <div key={s.key} className={`relative rounded-lg border ${tone} bg-card/40 p-3`}>
            <div className="flex items-center justify-between">
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">0{i + 1}</span>
              <StateGlyph state={s.state} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <Icon className="size-3.5 text-primary" />
              <span className="font-mono text-xs font-semibold">{s.label}</span>
            </div>
            <p className="mt-1 font-mono text-[10px] text-muted-foreground line-clamp-2">{s.detail}</p>
          </div>
        );
      })}
    </div>
  );
}
