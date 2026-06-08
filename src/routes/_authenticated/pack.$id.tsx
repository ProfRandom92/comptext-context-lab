import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, GateBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PipelineStatus, deriveStages, type RunSnapshot } from "@/components/PipelineStatus";
import { getPack, inspectRepo } from "@/lib/pack.functions";
import { askProvider } from "@/lib/proposal.functions";
import { toast } from "sonner";
import { Loader2, Bot, FileJson, Copy, Download, RotateCcw } from "lucide-react";

export const Route = createFileRoute("/_authenticated/pack/$id")({
  head: () => ({ meta: [{ title: "Pack — CompText Web" }] }),
  component: PackPage,
  errorComponent: ({ error }) => <pre className="p-6 font-mono text-sm text-blocked">{error.message}</pre>,
  notFoundComponent: () => <div className="p-6">Pack not found</div>,
});

function PackPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getPack);
  const ask = useServerFn(askProvider);
  const reinspect = useServerFn(inspectRepo);
  const router = useRouter();
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pack", id],
    queryFn: () => fn({ data: { id } }),
  });
  const [busyProvider, setBusyProvider] = useState<string | null>(null);
  const [resuming, setResuming] = useState(false);

  if (isLoading) return <AppShell><p className="p-6 font-mono text-sm text-muted-foreground">loading…</p></AppShell>;
  if (!data) return null;
  const { pack, proposals } = data;
  const packJsonObj = (pack.pack_json ?? {}) as { files?: { path: string; size: number; sha256: string }[] };
  const packJson = JSON.stringify(pack.pack_json, null, 2);
  const files = packJsonObj.files ?? [];

  const runProvider = async (provider: "lovable-ai" | "dummy") => {
    setBusyProvider(provider);
    try {
      const res = await ask({ data: { packId: id, provider } });
      toast.success("Proposal received");
      router.navigate({ to: "/proposal/$id", params: { id: res.proposalId } });
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusyProvider(null);
      refetch();
    }
  };

  const copy = () => { navigator.clipboard.writeText(packJson); toast.success("Copied"); };
  const download = () => {
    const blob = new Blob([packJson], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `pack-${id.slice(0, 8)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/pack</p>
        <div className="mt-1 flex items-start justify-between gap-4 flex-wrap">
          <div>
            <h1 className="text-2xl font-bold font-mono break-all">{pack.repo_url.replace("https://github.com/","")}@{pack.ref}</h1>
            <p className="mt-2 text-sm text-muted-foreground max-w-2xl">{pack.task}</p>
            <p className="mt-2 font-mono text-[11px] text-muted-foreground">sha256:{pack.sha256}</p>
          </div>
          <GateBadge status={pack.gate_status} />
        </div>

        {pack.gate_reason && (
          <Card className="mt-6 border-blocked/40">
            <CardContent className="py-4 font-mono text-sm text-blocked">
              gate: {pack.gate_reason}
            </CardContent>
          </Card>
        )}

        {(() => {
          const snapshot: RunSnapshot = {
            packExists: true,
            packSha: pack.sha256,
            fileCount: pack.file_count,
            gateStatus: pack.gate_status,
            gateReason: pack.gate_reason,
            proposalCount: proposals.length,
            latestProposal: proposals[0]
              ? { valid: proposals[0].valid, provider: proposals[0].provider, error: proposals[0].error }
              : null,
            latestReview: data.latestReview,
          };
          const stages = deriveStages(snapshot);
          const blockedStage = stages.find((s) => s.state === "blocked");
          const nextPending = stages.find((s) => s.state === "pending" || s.state === "running");
          const resumeTarget = blockedStage ?? nextPending ?? null;

          const runResume = async () => {
            if (!resumeTarget) return;
            setResuming(true);
            try {
              if (resumeTarget.key === "inspect" || resumeTarget.key === "pack" || resumeTarget.key === "gate") {
                const res = await reinspect({
                  data: { repoUrl: pack.repo_url, ref: pack.ref, task: pack.task },
                });
                toast.success("Re-inspected — new pack created");
                router.navigate({ to: "/pack/$id", params: { id: res.packId } });
                return;
              }
              if (resumeTarget.key === "provider" || resumeTarget.key === "proposal") {
                const res = await ask({ data: { packId: id, provider: "lovable-ai" } });
                toast.success("Provider re-run complete");
                router.navigate({ to: "/proposal/$id", params: { id: res.proposalId } });
                return;
              }
              if (resumeTarget.key === "review" && proposals[0]) {
                router.navigate({ to: "/proposal/$id", params: { id: proposals[0].id } });
                return;
              }
            } catch (e) {
              toast.error((e as Error).message);
            } finally {
              setResuming(false);
              refetch();
            }
          };

          const resumeLabel = !resumeTarget
            ? "run complete"
            : resumeTarget.key === "inspect" || resumeTarget.key === "pack" || resumeTarget.key === "gate"
              ? `re-inspect → rebuild pack (${resumeTarget.label})`
              : resumeTarget.key === "provider" || resumeTarget.key === "proposal"
                ? `re-run provider (${resumeTarget.label})`
                : `open ${resumeTarget.label.toLowerCase()}`;

          return (
            <div className="mt-6">
              <div className="mb-3 flex items-end justify-between gap-3 flex-wrap">
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  pipeline status · this run
                </p>
                <Button
                  size="sm"
                  variant={blockedStage ? "default" : "outline"}
                  disabled={resuming || !resumeTarget}
                  onClick={runResume}
                  className="font-mono gap-2"
                  title={resumeTarget ? `Resumes from stage: ${resumeTarget.label}. Reuses ${pack.repo_url}@${pack.ref} + task.` : "Nothing to resume"}
                >
                  {resuming ? <Loader2 className="size-3.5 animate-spin" /> : <RotateCcw className="size-3.5" />}
                  {resuming ? "resuming…" : resumeLabel}
                </Button>
              </div>
              <PipelineStatus snapshot={snapshot} />
            </div>
          );
        })()}


        <div className="mt-6 grid lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2">
            <Tabs defaultValue="files">
              <TabsList className="font-mono">
                <TabsTrigger value="files">files ({pack.file_count})</TabsTrigger>
                <TabsTrigger value="json"><FileJson className="size-3.5 mr-1" /> json</TabsTrigger>
              </TabsList>
              <TabsContent value="files">
                <Card>
                  <CardContent className="p-0 max-h-[60vh] overflow-auto">
                    <ul className="divide-y divide-border">
                      {files.map((f) => (
                        <li key={f.path} className="px-4 py-2 flex items-center justify-between text-xs font-mono">
                          <span className="truncate">{f.path}</span>
                          <span className="text-muted-foreground ml-3 shrink-0">{f.size}B · {f.sha256.slice(0,8)}</span>
                        </li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              </TabsContent>
              <TabsContent value="json">
                <Card>
                  <CardHeader className="flex-row items-center justify-between space-y-0 py-3">
                    <CardTitle className="text-sm font-mono">context-pack.json</CardTitle>
                    <div className="flex gap-1">
                      <Button size="sm" variant="ghost" onClick={copy}><Copy className="size-3.5" /></Button>
                      <Button size="sm" variant="ghost" onClick={download}><Download className="size-3.5" /></Button>
                    </div>
                  </CardHeader>
                  <CardContent className="p-0">
                    <pre className="text-xs font-mono p-4 max-h-[60vh] overflow-auto bg-secondary/30">{packJson}</pre>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>

          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 font-mono text-base">
                  <Bot className="size-4 text-primary" /> ask provider
                </CardTitle>
                <CardDescription>Provider output is treated as untrusted. You decide.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button
                  className="w-full font-mono justify-between gap-2"
                  disabled={pack.gate_status !== "pass" || !!busyProvider}
                  onClick={() => runProvider("lovable-ai")}
                >
                  {busyProvider === "lovable-ai" && <Loader2 className="size-3.5 animate-spin" />}
                  lovable-ai (gemini-3-flash) →
                </Button>
                <Button
                  variant="outline"
                  className="w-full font-mono justify-between gap-2"
                  disabled={pack.gate_status !== "pass" || !!busyProvider}
                  onClick={() => runProvider("dummy")}
                >
                  {busyProvider === "dummy" && <Loader2 className="size-3.5 animate-spin" />}
                  dummy (dry-run) →
                </Button>
                {pack.gate_status !== "pass" && (
                  <p className="text-xs font-mono text-blocked">gate blocked — provider call disabled</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-base">proposals</CardTitle>
              </CardHeader>
              <CardContent>
                {proposals.length === 0 ? (
                  <p className="text-xs font-mono text-muted-foreground">no proposals yet</p>
                ) : (
                  <ul className="space-y-2">
                    {proposals.map((p) => (
                      <li key={p.id}>
                        <Link to="/proposal/$id" params={{ id: p.id }} className="block text-xs font-mono p-2 rounded hover:bg-secondary">
                          <div className="flex items-center justify-between">
                            <span>{p.provider}</span>
                            <span className={p.valid ? "text-pass" : "text-blocked"}>{p.valid ? "valid" : "invalid"}</span>
                          </div>
                          <div className="text-muted-foreground mt-0.5">{new Date(p.created_at).toLocaleString()}</div>
                        </Link>
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
