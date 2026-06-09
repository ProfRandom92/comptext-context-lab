import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { previewRepo, type RepoPreview, type RepoFileKind } from "@/lib/pack.functions";
import type { DemoModeId } from "@/lib/demo-modes";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, FileCode2, FileText, Settings2, Beaker, Hammer, Layers,
  Workflow, Package, AlertTriangle, CheckCircle2, XCircle, MinusCircle, FileJson,
  ShieldCheck, BarChart3, ClipboardCheck, Archive,
} from "lucide-react";

type Meta = {
  label: string;
  icon: typeof FileCode2;
  tone: string;
  requirement: "required" | "recommended" | "optional";
  hint: string;
};

const KIND_META: Record<RepoFileKind, Meta> = {
  manifest:       { label: "Manifest",       icon: Package,         tone: "text-primary",          requirement: "required",    hint: "Cargo.toml / package.json — required so the gate can resolve the build target." },
  comptextConfig: { label: "Comptext cfg",   icon: Workflow,        tone: "text-pass",             requirement: "recommended", hint: ".comptext/ or comptext.toml — project-level policy overrides." },
  replaySidecar:  { label: "Replay sidecar", icon: Layers,          tone: "text-primary",          requirement: "recommended", hint: "Files with replay/sidecar/trace in path. Required for replay-drift and SPARK-style flows." },
  artifact:       { label: "Artifact",       icon: Archive,         tone: "text-primary",          requirement: "recommended", hint: "artifacts/** — preserved evidence outputs from prior runs." },
  schema:         { label: "Schema",         icon: FileJson,        tone: "text-muted-foreground", requirement: "optional",    hint: "schemas/** or *.schema.json — contract surfaces for proposals." },
  benchmark:      { label: "Benchmark",      icon: BarChart3,       tone: "text-muted-foreground", requirement: "optional",    hint: "benchmarks/ or reports/ — fixture-bound example metrics only." },
  validation:     { label: "Validation",     icon: ClipboardCheck,  tone: "text-muted-foreground", requirement: "recommended", hint: "validation/** — offline validation commands the proposal can cite." },
  docs:           { label: "Docs",           icon: FileText,        tone: "text-muted-foreground", requirement: "recommended", hint: "README / docs/ — strongly improves proposal grounding." },
  ci:             { label: "CI",             icon: Workflow,        tone: "text-muted-foreground", requirement: "optional",    hint: ".github/workflows — helps proposals stay green on CI." },
  source:         { label: "Source",         icon: FileCode2,       tone: "text-primary",          requirement: "recommended", hint: "src/**, core/**, agy7rust/**, *.rs/.ts/.py — main proposal substrate." },
  config:         { label: "Config",         icon: Settings2,       tone: "text-muted-foreground", requirement: "optional",    hint: "Lint / format / runtime config — passed verbatim to the provider." },
  tests:          { label: "Tests",          icon: Beaker,          tone: "text-warn",             requirement: "optional",    hint: "Test files — behavioural ground truth for the proposal." },
  other:          { label: "Other",          icon: Hammer,          tone: "text-muted-foreground", requirement: "optional",    hint: "Anything unclassified — filtered by allow-list before pack." },
};

const KIND_ORDER: RepoFileKind[] = [
  "manifest", "comptextConfig", "replaySidecar", "artifact", "schema",
  "benchmark", "validation", "source", "docs", "tests", "ci", "config", "other",
];

function bucketStatus(_kind: RepoFileKind, count: number, ineligible: number, meta: Meta) {
  if (count === 0 && meta.requirement === "required") {
    return { tone: "border-blocked/40 bg-blocked/5", icon: XCircle, iconTone: "text-blocked", label: "missing — gate will block" };
  }
  if (count === 0 && meta.requirement === "recommended") {
    return { tone: "border-warn/40 bg-warn/5", icon: AlertTriangle, iconTone: "text-warn", label: "missing — recommended" };
  }
  if (count > 0 && ineligible > 0 && count - ineligible === 0) {
    return { tone: "border-blocked/40 bg-blocked/5", icon: XCircle, iconTone: "text-blocked", label: `all ${ineligible} files filtered (size/deny)` };
  }
  if (count > 0 && ineligible > 0) {
    return { tone: "border-warn/40 bg-warn/5", icon: AlertTriangle, iconTone: "text-warn", label: `${ineligible} filtered (size/deny)` };
  }
  if (count === 0) {
    return { tone: "border-border", icon: MinusCircle, iconTone: "text-muted-foreground", label: "none — optional" };
  }
  return { tone: "border-pass/40 bg-pass/5", icon: CheckCircle2, iconTone: "text-pass", label: "ready" };
}

export function RepoInspector({ repoUrl, ref, mode = "custom" }: { repoUrl: string; ref: string; mode?: DemoModeId }) {
  const fn = useServerFn(previewRepo);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<RepoPreview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fn({ data: { repoUrl, ref, mode } });
      setData(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const replayExpected = mode === "spark-evidence" || mode === "replay-drift";

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Search className="size-4 text-primary" /> repo inspector
            </CardTitle>
            <CardDescription>
              Auto-detect comptext-relevant files, evidence surfaces, and replay-sidecar indicators.
            </CardDescription>
          </div>
          <Button onClick={run} disabled={busy || !repoUrl} variant="outline" className="font-mono gap-2">
            {busy && <Loader2 className="size-3.5 animate-spin" />}
            {busy ? "scanning…" : "scan"}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {err && <p className="font-mono text-xs text-blocked">{err}</p>}
        {!data && !err && (
          <p className="font-mono text-xs text-muted-foreground">
            ↳ unauthenticated GitHub tree scan; no file contents are downloaded yet.
          </p>
        )}
        {data && (
          <>
            {/* Evidence surfaces */}
            <div className="rounded-md border border-border bg-card/40 p-3">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                detected evidence surfaces
              </p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.evidenceSurfaces.length === 0 ? (
                  <span className="font-mono text-[11px] text-muted-foreground">none detected</span>
                ) : (
                  data.evidenceSurfaces.map((s) => (
                    <Badge key={s} variant="outline" className="font-mono text-[10px]">
                      <ShieldCheck className="size-3 mr-1 text-pass" />
                      {s}
                    </Badge>
                  ))
                )}
              </div>
              {replayExpected && (
                <div className="mt-3 border-t border-border/60 pt-2">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    replay sidecar indicators
                  </p>
                  {data.detected.hasReplaySidecar ? (
                    <p className="mt-1 font-mono text-[11px] text-pass">
                      {data.replaySidecarPaths.length} candidate sidecar path(s) detected.
                    </p>
                  ) : (
                    <p className="mt-1 font-mono text-[11px] text-warn">
                      Expected for this mode but none detected — proposal will note limitation.
                    </p>
                  )}
                  {data.replaySidecarPaths.length > 0 && (
                    <ul className="mt-1 space-y-0.5">
                      {data.replaySidecarPaths.slice(0, 6).map((p) => (
                        <li key={p} className="font-mono text-[10px] text-muted-foreground truncate">↳ {p}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </div>

            {/* Quick badges */}
            <div className="flex flex-wrap items-center gap-2">
              {data.detected.isRust && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />Rust</Badge>}
              {data.detected.hasCli && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />CLI</Badge>}
              {data.detected.hasReadme && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />README</Badge>}
              {data.detected.hasComptextConfig && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />comptext cfg</Badge>}
              {data.detected.hasArtifacts && <Badge variant="outline" className="font-mono">artifacts</Badge>}
              {data.detected.hasSchemas && <Badge variant="outline" className="font-mono">schemas</Badge>}
              {data.detected.hasBenchmarks && <Badge variant="outline" className="font-mono">benchmarks</Badge>}
              {data.detected.hasValidation && <Badge variant="outline" className="font-mono">validation</Badge>}
              {data.truncated && (
                <Badge variant="outline" className="font-mono text-warn border-warn/40">
                  <AlertTriangle className="size-3 mr-1" />tree truncated
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded-md border border-border bg-card/40 p-2">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">total</p>
                <p className="font-mono text-lg tabular-nums">{data.totals.totalFiles}</p>
              </div>
              <div className="rounded-md border border-pass/40 bg-pass/5 p-2">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">eligible</p>
                <p className="font-mono text-lg tabular-nums text-pass">{data.totals.eligibleFiles}</p>
              </div>
              <div className="rounded-md border border-border bg-card/40 p-2">
                <p className="font-mono text-[10px] uppercase text-muted-foreground">excluded</p>
                <p className="font-mono text-lg tabular-nums text-muted-foreground">
                  {data.totals.totalFiles - data.totals.eligibleFiles}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                gate inputs · per bucket
              </p>
              <ul className="space-y-1.5">
                {KIND_ORDER.map((k) => {
                  const meta = KIND_META[k];
                  const count = data.buckets[k];
                  const ineligible = data.ineligibleByKind[k];
                  const status = bucketStatus(k, count, ineligible, meta);
                  const StatusIcon = status.icon;
                  const KindIcon = meta.icon;
                  return (
                    <li key={k} className={`rounded-md border ${status.tone} px-3 py-2`}>
                      <div className="flex items-center justify-between gap-3">
                        <span className="inline-flex items-center gap-2 font-mono text-xs min-w-0">
                          <KindIcon className={`size-3.5 shrink-0 ${meta.tone}`} />
                          <span className="truncate">{meta.label}</span>
                          <span className="text-[9px] uppercase tracking-widest text-muted-foreground border border-border rounded px-1 py-px">
                            {meta.requirement}
                          </span>
                        </span>
                        <span className="inline-flex items-center gap-2 font-mono text-[11px] shrink-0">
                          <span className="tabular-nums text-muted-foreground">
                            {count - ineligible}/{count}
                          </span>
                          <StatusIcon className={`size-3.5 ${status.iconTone}`} />
                          <span className={status.iconTone}>{status.label}</span>
                        </span>
                      </div>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground leading-snug">
                        {meta.hint}
                      </p>
                    </li>
                  );
                })}
              </ul>
            </div>

            <div className="rounded-md border border-border">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>top files queued for pack</span>
                <span>{data.totals.eligibleFiles}/{data.totals.totalFiles} eligible · {(data.totals.eligibleBytes / 1024).toFixed(1)} KB</span>
              </div>
              <ul className="divide-y divide-border max-h-64 overflow-auto">
                {data.topFiles.map((f) => {
                  const meta = KIND_META[f.kind];
                  const Icon = meta.icon;
                  return (
                    <li key={f.path} className="px-3 py-1.5 flex items-center justify-between text-xs font-mono gap-2">
                      <span className="inline-flex items-center gap-2 truncate min-w-0">
                        <Icon className={`size-3 shrink-0 ${meta.tone}`} />
                        <span className="truncate">{f.path}</span>
                        {f.detectedTags.length > 0 && (
                          <span className="text-[9px] uppercase tracking-widest text-primary border border-primary/30 rounded px-1 py-px shrink-0">
                            {f.detectedTags[0]}
                          </span>
                        )}
                      </span>
                      <span className="text-muted-foreground ml-3 shrink-0">{f.size}B</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="font-mono text-[10px] text-muted-foreground">
              commit: {data.commitSha.slice(0, 10)} · branch resolved: {data.ref} · mode: {data.mode}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
