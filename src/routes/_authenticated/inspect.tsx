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
import { RepoInspector } from "@/components/RepoInspector";
import { DEMO_MODE_LIST, DEMO_MODES, type DemoModeId } from "@/lib/demo-modes";
import { toast } from "sonner";
import { Loader2, Terminal, ShieldCheck, AlertTriangle } from "lucide-react";

export const Route = createFileRoute("/_authenticated/inspect")({
  head: () => ({ meta: [{ title: "Inspect — CompText Context Lab" }] }),
  component: Inspect,
});

function Inspect() {
  const fn = useServerFn(inspectRepo);
  const router = useRouter();
  const [mode, setMode] = useState<DemoModeId>("cli-audit");
  const initial = DEMO_MODES["cli-audit"];
  const [repoUrl, setRepoUrl] = useState(initial.repoUrl);
  const [ref, setRef] = useState(initial.ref);
  const [task, setTask] = useState(initial.task);
  const [busy, setBusy] = useState(false);

  const selectMode = (id: DemoModeId) => {
    setMode(id);
    const m = DEMO_MODES[id];
    if (id !== "custom") {
      setRepoUrl(m.repoUrl);
      setRef(m.ref);
    }
    setTask(m.task);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fn({ data: { repoUrl, ref, task, mode } });
      toast.success("Context pack created");
      router.navigate({ to: "/pack/$id", params: { id: res.packId } });
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const meta = DEMO_MODES[mode];

  return (
    <AppShell>
      <div className="mx-auto max-w-3xl px-4 py-10 space-y-6">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">~/inspect</p>
          <h1 className="mt-1 text-3xl font-bold">New context session</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Pick a demo mode or point at any public GitHub repo. The inspector previews evidence
            surfaces before the deterministic pack is built.
          </p>
        </div>

        {/* Demo mode selector */}
        <Card>
          <CardHeader>
            <CardTitle className="font-mono text-base">demo mode</CardTitle>
            <CardDescription>Seeds repo URL, task, and expected evidence surfaces.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid sm:grid-cols-2 gap-2">
              {DEMO_MODE_LIST.map((m) => {
                const active = m.id === mode;
                return (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => selectMode(m.id)}
                    className={`text-left rounded-md border px-3 py-2 transition-colors ${active ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"}`}
                  >
                    <p className="font-mono text-xs font-semibold">{m.title}</p>
                    <p className="font-mono text-[10px] text-muted-foreground mt-0.5 line-clamp-2">{m.blurb}</p>
                  </button>
                );
              })}
            </div>

            {meta.surfaces.length > 0 && (
              <div>
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">expected evidence surfaces</p>
                <div className="mt-1 flex flex-wrap gap-1.5">
                  {meta.surfaces.map((s) => (
                    <span key={s} className="inline-flex items-center gap-1 font-mono text-[10px] border border-border rounded px-1.5 py-0.5">
                      <ShieldCheck className="size-3 text-pass" /> {s}
                    </span>
                  ))}
                </div>
              </div>
            )}

            <div>
              <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">claim boundaries</p>
              <ul className="mt-1 space-y-0.5">
                {meta.claimBoundaries.map((c) => (
                  <li key={c} className="font-mono text-[11px] text-muted-foreground flex gap-1.5">
                    <AlertTriangle className="size-3 text-warn shrink-0 mt-0.5" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 font-mono text-base">
              <Terminal className="size-4 text-primary" /> ctxt source
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
                <Textarea id="task" required value={task} rows={5} onChange={(e) => setTask(e.target.value)} />
              </div>
              <div className="pt-2 flex items-center gap-3">
                <Button type="submit" disabled={busy} className="font-mono gap-2">
                  {busy && <Loader2 className="size-3.5 animate-spin" />}
                  {busy ? "building pack…" : "build pack"}
                </Button>
                <span className="text-xs font-mono text-muted-foreground">
                  ↳ {busy ? "fetching tree + files…" : `deterministic · mode=${mode}`}
                </span>
              </div>
            </form>
          </CardContent>
        </Card>

        <RepoInspector repoUrl={repoUrl} ref={ref} mode={mode} />
      </div>
    </AppShell>
  );
}
