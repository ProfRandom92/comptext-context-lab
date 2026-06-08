import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { previewRepo, type RepoPreview, type RepoFileKind } from "@/lib/pack.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Loader2, Search, FileCode2, FileText, Settings2, Beaker, Hammer,
  Workflow, Package, AlertTriangle, CheckCircle2, XCircle, MinusCircle,
} from "lucide-react";

type Meta = {
  label: string;
  icon: typeof FileCode2;
  tone: string;
  /** required → next gate fails without it; recommended → gate passes but proposal quality degrades; optional → informational */
  requirement: "required" | "recommended" | "optional";
  /** Plain-language hint shown next to the bucket */
  hint: string;
};

const KIND_META: Record<RepoFileKind, Meta> = {
  manifest:       { label: "Manifest",      icon: Package,    tone: "text-primary",          requirement: "required",    hint: "Cargo.toml / package.json — required so the gate can resolve the build target." },
  rustSource:     { label: "Rust source",   icon: FileCode2,  tone: "text-primary",          requirement: "recommended", hint: "*.rs files. Needed for any Rust change-proposal; without them the provider only sees docs." },
  comptextConfig: { label: "Comptext cfg",  icon: Workflow,   tone: "text-pass",             requirement: "recommended", hint: ".comptext/ or comptext.toml. Lets the gate honour project-level policy overrides." },
  doc:            { label: "Docs",          icon: FileText,   tone: "text-muted-foreground", requirement: "recommended", hint: "README / docs/. Strongly improves proposal grounding." },
  ci:             { label: "CI",            icon: Workflow,   tone: "text-muted-foreground", requirement: "optional",    hint: ".github/workflows. Helps the proposal stay green on CI." },
  test:           { label: "Tests",         icon: Beaker,     tone: "text-warn",             requirement: "optional",    hint: "Test files. Used as behavioural ground truth for the proposal." },
  config:         { label: "Config",        icon: Settings2,  tone: "text-muted-foreground", requirement: "optional",    hint: "Lint / format / runtime config. Passed verbatim to the provider." },
  example:        { label: "Examples",      icon: Hammer,     tone: "text-muted-foreground", requirement: "optional",    hint: "examples/. Useful for API surface, not gating." },
  other:          { label: "Other",         icon: FileText,   tone: "text-muted-foreground", requirement: "optional",    hint: "Anything unclassified. Filtered by allow-list before the pack stage." },
};

const KIND_ORDER: RepoFileKind[] = ["manifest", "comptextConfig", "rustSource", "doc", "ci", "test", "config", "example", "other"];

function bucketStatus(kind: RepoFileKind, count: number, ineligible: number, meta: Meta) {
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

export function RepoInspector({ repoUrl, ref }: { repoUrl: string; ref: string }) {
  const fn = useServerFn(previewRepo);
  const [busy, setBusy] = useState(false);
  const [data, setData] = useState<RepoPreview | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const run = async () => {
    setBusy(true);
    setErr(null);
    try {
      const res = await fn({ data: { repoUrl, ref } });
      setData(res);
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-2">
          <div>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Search className="size-4 text-primary" /> repo inspector
            </CardTitle>
            <CardDescription>
              Auto-detect comptext-relevant files and flag what the Policy Gate needs next.
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
            ↳ runs an unauthenticated GitHub tree scan; no file contents are downloaded yet.
          </p>
        )}
        {data && (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {data.detected.isRust && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />Rust project</Badge>}
              {data.detected.hasCli && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />CLI binary</Badge>}
              {data.detected.hasReadme && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />README</Badge>}
              {data.detected.hasComptextConfig && <Badge variant="outline" className="font-mono"><CheckCircle2 className="size-3 mr-1 text-pass" />comptext config</Badge>}
              {data.detected.hasTests && <Badge variant="outline" className="font-mono">tests</Badge>}
              {data.detected.hasCi && <Badge variant="outline" className="font-mono">CI</Badge>}
              {data.truncated && (
                <Badge variant="outline" className="font-mono text-warn border-warn/40">
                  <AlertTriangle className="size-3 mr-1" />tree truncated
                </Badge>
              )}
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
                    <li key={f.path} className="px-3 py-1.5 flex items-center justify-between text-xs font-mono">
                      <span className="inline-flex items-center gap-2 truncate">
                        <Icon className={`size-3 shrink-0 ${meta.tone}`} />
                        <span className="truncate">{f.path}</span>
                      </span>
                      <span className="text-muted-foreground ml-3 shrink-0">{f.size}B</span>
                    </li>
                  );
                })}
              </ul>
            </div>

            <p className="font-mono text-[10px] text-muted-foreground">
              commit: {data.commitSha.slice(0, 10)} · branch resolved: {data.ref}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
