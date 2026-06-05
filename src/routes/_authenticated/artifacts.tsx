import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell, GateBadge } from "@/components/AppShell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { listArtifacts } from "@/lib/proposal.functions";

export const Route = createFileRoute("/_authenticated/artifacts")({
  head: () => ({ meta: [{ title: "Artifacts — CompText Web" }] }),
  component: Artifacts,
});

function Artifacts() {
  const fn = useServerFn(listArtifacts);
  const { data, isLoading } = useQuery({ queryKey: ["artifacts"], queryFn: () => fn() });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10 space-y-8">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/artifacts</p>
          <h1 className="mt-1 text-3xl font-bold">History</h1>
          <p className="mt-2 text-sm text-muted-foreground">Every pack, proposal, and review you've produced.</p>
        </div>
        {isLoading ? (
          <p className="font-mono text-sm text-muted-foreground">loading…</p>
        ) : (
          <div className="grid lg:grid-cols-3 gap-6">
            <Card>
              <CardHeader><CardTitle className="font-mono text-base">context packs</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
                {data?.packs.length === 0 && <p className="text-xs font-mono text-muted-foreground">none</p>}
                {data?.packs.map((p) => (
                  <Link key={p.id} to="/pack/$id" params={{ id: p.id }} className="block p-2 rounded hover:bg-secondary text-xs font-mono">
                    <div className="flex items-center justify-between gap-2">
                      <span className="truncate">{p.repo_url.replace("https://github.com/","")}@{p.ref}</span>
                      <GateBadge status={p.gate_status} />
                    </div>
                    <div className="text-muted-foreground mt-0.5">{p.file_count} files · {new Date(p.created_at).toLocaleDateString()}</div>
                  </Link>
                ))}
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="font-mono text-base">proposals</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
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
              <CardHeader><CardTitle className="font-mono text-base">reviews</CardTitle></CardHeader>
              <CardContent className="space-y-2 max-h-[70vh] overflow-auto">
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
          </div>
        )}
      </div>
    </AppShell>
  );
}
