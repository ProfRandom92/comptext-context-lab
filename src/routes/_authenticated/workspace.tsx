import { createFileRoute, Link, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useQuery } from "@tanstack/react-query";
import { AppShell, GateBadge } from "@/components/AppShell";
import { PipelineStatus } from "@/components/PipelineStatus";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { listPacks } from "@/lib/pack.functions";
import { Plus, Terminal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/workspace")({
  head: () => ({
    meta: [
      { title: "Workspace — CompText Web" },
      { name: "description", content: "Manage your deterministic context packs and review AI-generated proposal artifacts in your workspace." },
      { property: "og:title", content: "Workspace — CompText Web" },
      { property: "og:description", content: "Manage your deterministic context packs and review AI-generated proposal artifacts in your workspace." },
    ],
  }),
  component: Workspace,
  errorComponent: ({ error }) => <pre className="p-6 font-mono text-sm text-blocked">{error.message}</pre>,
  notFoundComponent: () => <div className="p-6">Not found</div>,
});

function Workspace() {
  const fn = useServerFn(listPacks);
  const router = useRouter();
  const { data, isLoading } = useQuery({ queryKey: ["packs"], queryFn: () => fn() });

  return (
    <AppShell>
      <div className="mx-auto max-w-6xl px-4 py-10">
        <div className="flex items-end justify-between mb-8">
          <div>
            <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/workspace</p>
            <h1 className="mt-1 text-3xl font-bold">Context sessions</h1>
          </div>
          <Button onClick={() => router.navigate({ to: "/inspect" })} className="font-mono gap-2">
            <Plus className="size-4" /> new pack
          </Button>
        </div>

        {isLoading ? (
          <p className="font-mono text-sm text-muted-foreground">loading…</p>
        ) : data?.packs.length === 0 ? (
          <Card className="border-dashed">
            <CardContent className="py-16 text-center">
              <Terminal className="size-8 text-muted-foreground mx-auto" />
              <p className="mt-4 font-mono text-sm text-muted-foreground">no context packs yet</p>
              <Link to="/inspect"><Button className="mt-6 font-mono">Inspect a repo</Button></Link>
            </CardContent>
          </Card>
        ) : (
          <div className="grid sm:grid-cols-2 gap-4">
            {data?.packs.map((p) => (
              <Link key={p.id} to="/pack/$id" params={{ id: p.id }}>
                <Card className="hover:border-primary/50 transition-colors h-full">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-2">
                      <CardTitle className="font-mono text-sm break-all">{p.repo_url.replace("https://github.com/", "")}@{p.ref}</CardTitle>
                      <GateBadge status={p.gate_status} />
                    </div>
                    <CardDescription className="line-clamp-2">{p.task}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                      <span>{p.file_count} files</span>
                      <span>{new Date(p.created_at).toLocaleString()}</span>
                    </div>
                    <p className="mt-2 font-mono text-[10px] text-muted-foreground truncate">sha256:{p.sha256.slice(0, 24)}…</p>
                    <div className="mt-3 pt-3 border-t border-border/60">
                      <PipelineStatus
                        compact
                        snapshot={{
                          packExists: true,
                          packSha: p.sha256,
                          fileCount: p.file_count,
                          gateStatus: p.gate_status,
                          gateReason: null,
                          proposalCount: 0,
                          latestProposal: null,
                          latestReview: null,
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
