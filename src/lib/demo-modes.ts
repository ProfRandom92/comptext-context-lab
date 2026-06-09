// Demo mode catalog — shared between Landing, Inspect, Pack views.
// No backend mutation: these only seed UI defaults and the evidence section
// of the generated pack_json.

export type DemoModeId = "cli-audit" | "spark-evidence" | "replay-drift" | "custom";

export type DemoMode = {
  id: DemoModeId;
  title: string;
  shortLabel: string;
  repoUrl: string;
  ref: string;
  blurb: string;
  task: string;
  surfaces: string[];
  claimBoundaries: string[];
  // hints used by the repo inspector to flag interesting paths
  replaySidecarHints: string[];
};

export const DEMO_MODES: Record<DemoModeId, DemoMode> = {
  "cli-audit": {
    id: "cli-audit",
    title: "CLI Repo Audit",
    shortLabel: "CLI Audit",
    repoUrl: "https://github.com/ProfRandom92/comptext-cli",
    ref: "main",
    blurb:
      "Walk the comptext-cli surface as a proposal-gated AI engineering flow: inspect → pack → provider boundary → proposal → review → artifacts.",
    task:
      "Inspect this repository as a proposal-gated AI engineering workflow. Identify the context-pack boundary, provider boundary, review gate, and safest next improvement without mutating files.",
    surfaces: [
      "context inspect",
      "context pack",
      "provider boundary",
      "proposal mode",
      "review gate",
      "artifacts",
    ],
    claimBoundaries: [
      "Read-only review — no files are written back.",
      "No certification, compliance, or production-readiness is implied.",
      "Provider output is treated as untrusted and surfaced as a proposal only.",
    ],
    replaySidecarHints: [],
  },
  "spark-evidence": {
    id: "spark-evidence",
    title: "SPARK Evidence Flow",
    shortLabel: "SPARK Evidence",
    repoUrl: "https://github.com/ProfRandom92/comptext-sparkctl",
    ref: "main",
    blurb:
      "Surface the SPARK-style evidence pipeline: replay sidecar, SHA-256 anchors, context build/render/validate, offline validation, handoff readiness.",
    task:
      "Inspect this repository as a deterministic evidence pipeline. Identify replay-sidecar fields, SHA-256 integrity anchors, SPARK-style context artifacts, validation commands, and claim boundaries.",
    surfaces: [
      "replay sidecar",
      "sha-256 sidecar",
      "spark-style context artifacts",
      "context build / render / validate",
      "offline validation",
      "handoff readiness",
    ],
    claimBoundaries: [
      "SPARK-style / SPARK-oriented only — no compatibility certification.",
      "Integrity anchors are file SHA-256s; not a legal or regulatory attestation.",
      "Validation runs are local and fixture-bound.",
    ],
    replaySidecarHints: ["sidecar", "replay", "spark", "evidence", "trace"],
  },
  "replay-drift": {
    id: "replay-drift",
    title: "Replay Drift Lab",
    shortLabel: "Replay Drift",
    repoUrl: "https://github.com/ProfRandom92/Comptextv7",
    ref: "main",
    blurb:
      "Probe the Comptextv7 replay-drift prototype: deterministic replay metrics, fixture-bound evidence, EVIDENCE_LOSS / CONSTRAINT_DRIFT failure labels.",
    task:
      "Inspect this repository as a replay-drift validation prototype. Identify deterministic replay metrics, fixture-bound evidence artifacts, failure labels, and safe limitations.",
    surfaces: [
      "deterministic replay validation",
      "fixture-bound replay metrics",
      "evidence survival checks",
      "operational drift",
      "failure labels (EVIDENCE_LOSS, CONSTRAINT_DRIFT)",
    ],
    claimBoundaries: [
      "Metrics are fixture-bound example values, not production benchmarks.",
      "Replay drift is observed against bundled fixtures only.",
      "Failure labels are operational signals, not regulatory categories.",
    ],
    replaySidecarHints: ["replay", "drift", "fixture", "evidence", "trace", "validation"],
  },
  custom: {
    id: "custom",
    title: "Custom GitHub Repo",
    shortLabel: "Custom",
    repoUrl: "",
    ref: "main",
    blurb: "Point at any public GitHub repository and run it through the same pipeline.",
    task:
      "Inspect this repository through the CompText Context Lab pipeline. Identify the context-pack boundary, evidence surfaces, and the safest next improvement without mutating files.",
    surfaces: [],
    claimBoundaries: [
      "Read-only review — no files are written back.",
      "Provider output is treated as untrusted; review gate is mandatory.",
    ],
    replaySidecarHints: [],
  },
};

export const DEMO_MODE_LIST: DemoMode[] = [
  DEMO_MODES["cli-audit"],
  DEMO_MODES["spark-evidence"],
  DEMO_MODES["replay-drift"],
  DEMO_MODES.custom,
];
