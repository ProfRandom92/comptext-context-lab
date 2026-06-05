import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { AppShell } from "@/components/AppShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { inspectRepo } from "@/lib/pack.functions";
import { toast } from "sonner";
import { Loader2, Terminal } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inspect")({
  head: () => ({ meta: [{ title: "Inspect — CompText Web" }] }),
  component: Inspect,
});

function Inspect() {
  const fn = useServerFn(inspectRepo);
  const router = useRouter();
  const [repoUrl, setRepoUrl] = useState("https://github.com/ProfRandom92/comptext-cli");
  const [ref, setRef] = useState("main");
  const [task, setTask] = useState("Explain the overall structure of this repository and suggest one safe improvement.");
  const [busy, setBusy] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fn({ data: { repoUrl, ref, task } });
      toast.success("Context pack created");
      router.navigate({ to: "/pack/$id", params: { id: res.packId } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10">
        <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/inspect</p>
        <h1 className="mt-1 text-3xl font-bold">New context pack</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          Point at a public GitHub repo. We pull the tree, apply the default policy, scan for secret-like
          patterns, then hash the result.
        </p>

        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Terminal className="size-4 text-primary" /> ctxt context pack
            </CardTitle>
            <CardDescription>Default policy applies (allow code/docs, deny binaries/secrets, ≤ 64 KB, ≤ 60 files).</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={submit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="url" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">repository url</Label>
                <Input id="url" required value={repoUrl} onChange={(e) => setRepoUrl(e.target.value)} className="font-mono" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="ref" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">ref / branch</Label>
                <Input id="ref" required value={ref} onChange={(e) => setRef(e.target.value)} className="font-mono w-48" />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="task" className="font-mono text-xs uppercase tracking-wide text-muted-foreground">task</Label>
                <Textarea id="task" required value={task} rows={4} onChange={(e) => setTask(e.target.value)} />
              </div>
              <div className="pt-2 flex items-center gap-3">
                <Button type="submit" disabled={busy} className="font-mono gap-2">
                  {busy && <Loader2 className="size-3.5 animate-spin" />}
                  {busy ? "building pack…" : "build pack"}
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                  ↳ {busy ? "fetching tree + files…" : "deterministic, sorted, hashed"}
                </span>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
