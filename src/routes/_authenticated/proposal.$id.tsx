import { createFileRoute } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { AppShell, GateBadge } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { getProposal, submitReview } from "@/lib/proposal.functions";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

export const Route = createFileRoute("/_authenticated/proposal/$id")({
  head: () => ({ meta: [{ title: "Proposal — CompText Web" }] }),
  component: ProposalPage,
  errorComponent: ({ error }) => <pre className="p-6 font-mono text-sm text-blocked">{error.message}</pre>,
  notFoundComponent: () => <div className="p-6">Proposal not found</div>,
});

type ProposalBody = {
  summary?: string;
  plan?: string[];
  affected_files?: string[];
  diffs?: { path: string; rationale: string; patch: string }[];
  risks?: string[];
};

function ProposalPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getProposal);
  const review = useServerFn(submitReview);
  const { data, isLoading, refetch } = useQuery({
    queryKey: ["proposal", id],
    queryFn: () => fn({ data: { id } }),
  });
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  if (isLoading) return <AppShell><p className="p-6 font-mono text-sm text-muted-foreground">loading…</p></AppShell>;
  if (!data) return null;
  const { proposal, review: existing } = data;
  const body = (proposal.response_json ?? {}) as ProposalBody;

  const submit = async (status: "pass" | "notes" | "blocked") => {
    setBusy(status);
    try {
      await review({ data: { proposalId: id, status, notes: notes || undefined } });
      toast.success(`Review ${status.toUpperCase()} recorded`);
      refetch();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-5xl px-4 py-10 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/proposal</p>
          <div className="mt-1 flex items-center justify-between gap-4 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">
              {proposal.provider} <span className="text-muted-foreground">·</span> {proposal.model}
            </h1>
            <div className="flex gap-2">
              {existing && <GateBadge status={existing.status} />}
              <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono uppercase ${proposal.valid ? "bg-pass/15 text-pass border-pass/30" : "bg-blocked/15 text-blocked border-blocked/30"}`}>
                {proposal.valid ? "valid" : "invalid"}
              </span>
            </div>
          </div>
          {proposal.error && <p className="mt-2 text-sm font-mono text-blocked">{proposal.error}</p>}
        </div>

        {proposal.valid && (
          <>
            <Card>
              <CardHeader><CardTitle className="text-base font-mono">summary</CardTitle></CardHeader>
              <CardContent><p className="text-sm leading-relaxed">{body.summary}</p></CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
              <Card>
                <CardHeader><CardTitle className="text-base font-mono">plan</CardTitle></CardHeader>
                <CardContent>
                  <ol className="space-y-1 text-sm list-decimal pl-5">
                    {body.plan?.map((s, i) => <li key={i}>{s}</li>)}
                  </ol>
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="text-base font-mono">affected files</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-xs font-mono">
                    {body.affected_files?.map((f) => <li key={f}>{f}</li>)}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {body.diffs && body.diffs.length > 0 && (
              <Card>
                <CardHeader><CardTitle className="text-base font-mono">proposed diffs</CardTitle><CardDescription>Never auto-applied. Inspect before acting.</CardDescription></CardHeader>
                <CardContent className="space-y-4">
                  {body.diffs.map((d, i) => (
                    <div key={i} className="border border-border rounded-md overflow-hidden">
                      <div className="px-3 py-2 bg-secondary/40 font-mono text-xs flex items-center justify-between">
                        <span>{d.path}</span>
                      </div>
                      <p className="px-3 py-2 text-xs text-muted-foreground">{d.rationale}</p>
                      <pre className="px-3 py-2 text-xs font-mono bg-secondary/20 overflow-auto max-h-80">{d.patch}</pre>
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {body.risks && body.risks.length > 0 && (
              <Card className="border-warn/40">
                <CardHeader><CardTitle className="text-base font-mono text-warn">risks</CardTitle></CardHeader>
                <CardContent>
                  <ul className="space-y-1 text-sm list-disc pl-5">
                    {body.risks.map((r, i) => <li key={i}>{r}</li>)}
                  </ul>
                </CardContent>
              </Card>
            )}
          </>
        )}

        <Card>
          <CardHeader>
            <CardTitle className="text-base font-mono">review gate</CardTitle>
            <CardDescription>
              {existing
                ? `Last review: ${existing.status.toUpperCase()} on ${new Date(existing.created_at).toLocaleString()}`
                : "No edits applied — this is the gate. Record your decision."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Textarea placeholder="Notes (optional)" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
            <div className="flex flex-wrap gap-2">
              <Button onClick={() => submit("pass")} disabled={!!busy} className="font-mono gap-2 bg-pass text-pass-foreground hover:bg-pass/90">
                {busy === "pass" && <Loader2 className="size-3.5 animate-spin" />} PASS
              </Button>
              <Button onClick={() => submit("notes")} disabled={!!busy} variant="outline" className="font-mono gap-2 border-warn/50 text-warn hover:bg-warn/10">
                {busy === "notes" && <Loader2 className="size-3.5 animate-spin" />} PASS WITH NOTES
              </Button>
              <Button onClick={() => submit("blocked")} disabled={!!busy} variant="outline" className="font-mono gap-2 border-blocked/50 text-blocked hover:bg-blocked/10">
                {busy === "blocked" && <Loader2 className="size-3.5 animate-spin" />} BLOCKED
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
