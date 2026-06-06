import { useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { previewRepo, type RepoPreview } from "@/lib/pack.functions";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Search, FileCode2, FileText, Settings2, Beaker, Hammer, Workflow, Package, AlertTriangle, CheckCircle2 } from "lucide-react";

const KIND_META: Record<string, { label: string; icon: typeof FileCode2; tone: string }> = {
  manifest:        { label: "Manifest",       icon: Package,      tone: "text-primary" },
  rustSource:      { label: "Rust source",    icon: FileCode2,    tone: "text-primary" },
  doc:             { label: "Docs",           icon: FileText,     tone: "text-muted-foreground" },
  config:          { label: "Config",         icon: Settings2,    tone: "text-muted-foreground" },
  test:            { label: "Tests",          icon: Beaker,       tone: "text-warn" },
  example:         { label: "Examples",       icon: Hammer,       tone: "text-muted-foreground" },
  comptextConfig:  { label: "Comptext cfg",   icon: Workflow,     tone: "text-pass" },
  ci:              { label: "CI",             icon: Workflow,     tone: "text-muted-foreground" },
  other:           { label: "Other",          icon: FileText,     tone: "text-muted-foreground" },
};

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
              Auto-detect comptext-relevant files (manifests, sources, docs, configs) before sending to the Policy Gate.
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {Object.entries(data.buckets).map(([k, count]) => {
                const meta = KIND_META[k] ?? KIND_META.other;
                const Icon = meta.icon;
                return (
                  <div key={k} className="rounded-md border border-border bg-card/40 px-3 py-2 flex items-center justify-between">
                    <span className="inline-flex items-center gap-2 font-mono text-xs">
                      <Icon className={`size-3.5 ${meta.tone}`} />
                      {meta.label}
                    </span>
                    <span className="font-mono text-xs tabular-nums">{count}</span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-md border border-border">
              <div className="px-3 py-2 border-b border-border flex items-center justify-between font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                <span>top files queued for pack</span>
                <span>{data.totals.eligibleFiles}/{data.totals.totalFiles} eligible · {(data.totals.eligibleBytes / 1024).toFixed(1)} KB</span>
              </div>
              <ul className="divide-y divide-border max-h-64 overflow-auto">
                {data.topFiles.map((f) => {
                  const meta = KIND_META[f.kind] ?? KIND_META.other;
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
