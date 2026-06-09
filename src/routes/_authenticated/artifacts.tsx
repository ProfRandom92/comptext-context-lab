import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell, GateBadge } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { listArtifacts } from "@/lib/proposal.functions";
import { Download } from "lucide-react";

export const Route = createFileRoute("/_authenticated/artifacts")({
  head: () => ({ meta: [{ title: "Evidence Ledger — CompText Context Lab" }] }),
  component: Artifacts,
});

function Artifacts() {
  const fn = useServerFn(listArtifacts);
  const { data, isLoading } = useQuery({ queryKey: ["artifacts"], queryFn: () => fn() });

  const downloadLedger = () => {
    if (!data) return;
    const blob = new Blob([JSON.stringify(data.ledger, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `evidence-ledger-${new Date().toISOString().slice(0,10)}.json`;
    a.click(); URL.revokeObjectURL(url);
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div className="flex items-end justify-between gap-3 flex-wrap">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/artifacts</p>
            <h1 className="mt-1 text-3xl font-bold">Evidence Ledger</h1>
            <p className="mt-2 text-sm text-muted-foreground">
              Rolled-up view per run — pack SHA, gate, provider, review, mode.
            </p>
          </div>
          <Button variant="outline" className="font-mono gap-2" disabled={!data || data.ledger.length === 0} onClick={downloadLedger}>
            <Download className="size-3.5" /> export ledger json
          </Button>
        </div>

        {isLoading ? (
          <p className="font-mono text-sm text-muted-foreground">loading…</p>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="font-mono text-base">runs ({data?.ledger.length ?? 0})</CardTitle>
                <CardDescription>One row per context pack. Click to open.</CardDescription>
              </CardHeader>
              <CardContent className="p-0 overflow-auto">
                {data?.ledger.length === 0 ? (
                  <p className="px-4 py-6 text-xs font-mono text-muted-foreground">no runs yet</p>
                ) : (
                  <table className="w-full text-xs font-mono">
                    <thead className="text-left text-[10px] uppercase tracking-widest text-muted-foreground border-b border-border">
                      <tr>
                        <th className="px-3 py-2">repo@ref</th>
                        <th className="px-3 py-2">mode</th>
                        <th className="px-3 py-2">gate</th>
                        <th className="px-3 py-2">provider</th>
                        <th className="px-3 py-2">review</th>
                        <th className="px-3 py-2 text-right">files</th>
                        <th className="px-3 py-2">pack sha</th>
                        <th className="px-3 py-2">created</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data?.ledger.map((r) => (
                        <tr key={r.pack_id} className="border-b border-border/40 hover:bg-secondary/40">
                          <td className="px-3 py-2">
                            <Link to="/pack/$id" params={{ id: r.pack_id }} className="hover:text-primary truncate inline-block max-w-[26ch]">
                              {r.repo_url.replace("https://github.com/", "")}@{r.ref}
                            </Link>
                          </td>
                          <td className="px-3 py-2 text-muted-foreground">{r.mode}</td>
                          <td className="px-3 py-2"><GateBadge status={r.gate_status} /></td>
                          <td className="px-3 py-2">
                            <span className={r.provider_status === "valid" ? "text-pass" : r.provider_status === "invalid" ? "text-blocked" : "text-muted-foreground"}>
                              {r.provider_status}
                            </span>
                            {r.provider && <span className="text-muted-foreground"> · {r.provider}</span>}
                          </td>
                          <td className="px-3 py-2">
                            {r.review_status === "—" ? (
                              <span className="text-muted-foreground">—</span>
                            ) : (
                              <GateBadge status={r.review_status} />
                            )}
                          </td>
                          <td className="px-3 py-2 text-right tabular-nums">{r.file_count}</td>
                          <td className="px-3 py-2 text-muted-foreground">{r.sha256.slice(0, 10)}</td>
                          <td className="px-3 py-2 text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                )}
              </CardContent>
            </Card>

            <div className="grid lg:grid-cols-3 gap-6">
              <Card>
                <CardHeader><CardTitle className="font-mono text-base">recent proposals</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[50vh] overflow-auto">
                  {data?.proposals.length === 0 && <p className="text-xs font-mono text-muted-foreground">none</p>}
                  {data?.proposals.map((p) => (
                    <Link key={p.id} to="/proposal/$id" params={{ id: p.id }} className="block p-2 rounded hover:bg-secondary text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <span>{p.provider}</span>
                        <span className={p.valid ? "text-pass" : "text-blocked"}>{p.valid ? "valid" : "invalid"}</span>
                      </div>
                      <div className="text-muted-foreground mt-0.5">{p.model} · {new Date(p.created_at).toLocaleDateString()}</div>
                    </Link>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="font-mono text-base">recent reviews</CardTitle></CardHeader>
                <CardContent className="space-y-2 max-h-[50vh] overflow-auto">
                  {data?.reviews.length === 0 && <p className="text-xs font-mono text-muted-foreground">none</p>}
                  {data?.reviews.map((r) => (
                    <Link key={r.id} to="/proposal/$id" params={{ id: r.proposal_id }} className="block p-2 rounded hover:bg-secondary text-xs font-mono">
                      <div className="flex items-center justify-between">
                        <GateBadge status={r.status} />
                        <span className="text-muted-foreground">{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      {r.notes && <div className="mt-1 text-muted-foreground line-clamp-2">{r.notes}</div>}
                    </Link>
                  ))}
                </CardContent>
              </Card>
              <Card>
                <CardHeader><CardTitle className="font-mono text-base">claim boundaries</CardTitle></CardHeader>
                <CardContent className="space-y-2 text-xs font-mono text-muted-foreground">
                  <p>· Read-only review — no files are written back to GitHub.</p>
                  <p>· No certification, compliance, or production-readiness is implied.</p>
                  <p>· Replay metrics surfaced here are fixture-bound example values.</p>
                  <p>· SPARK-style / SPARK-oriented — no SPARK compatibility certification.</p>
                  <p>· Provider output is treated as untrusted and surfaced as a proposal artifact only.</p>
                </CardContent>
              </Card>
            </div>
          </>
        )}
      </div>
    </AppShell>
  );
}
