import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import {
  Terminal, FileJson, Layers, ShieldCheck, Bot, FileCheck2, ClipboardCheck,
  Archive, ArrowRight, Github,
} from "lucide-react";
import { BrandIcon, BrandLogo } from "@/components/BrandLogo";
import { DEMO_MODE_LIST } from "@/lib/demo-modes";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "CompText Context Lab — Deterministic Context Packs & AI Gates" },
      { name: "description", content: "Build hashed Context Packs, isolate replay-critical state, run policy gates, and preserve model output as reviewable proposal artifacts." },
      { property: "og:title", content: "CompText Context Lab" },
      { property: "og:description", content: "Models are providers. Context is the product. Evidence is the interface." },
      { property: "og:url", content: "https://comptext-context.lovable.app/" },
    ],
    links: [{ rel: "canonical", href: "https://comptext-context.lovable.app/" }],
    scripts: [
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "CompText Context Lab",
          url: "https://comptext-context.lovable.app",
          description: "Reviewer console for deterministic Context Packs and proposal-gated AI workflows.",
        }),
      },
      {
        type: "application/ld+json",
        children: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          name: "CompText",
          url: "https://comptext-context.lovable.app",
          sameAs: ["https://github.com/ProfRandom92/comptext-cli"],
        }),
      },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandIcon className="size-7" />
            <BrandLogo className="h-3.5" alt="CompText" />
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">/context-lab</span>
          </Link>
          <nav className="flex items-center gap-2 text-sm font-mono">
            <Link to="/about" className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors">about</Link>
            <a
              href="https://github.com/ProfRandom92/comptext-cli"
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5"
            >
              <Github className="size-3.5" /> cli
            </a>
            <Link to="/auth">
              <Button size="sm" className="font-mono">sign in</Button>
            </Link>
          </nav>
        </div>
      </header>

      {/* Hero — reviewer console framing */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-5xl px-4 py-16 sm:py-24">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground mb-6">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            reviewer console · context-lab v1
          </div>
          <div className="mb-5">
            <BrandLogo className="h-14 sm:h-20" />
          </div>
          <h1 className="text-3xl sm:text-5xl font-bold tracking-tight">
            CompText Context Lab
          </h1>
          <p className="mt-3 text-base sm:text-lg text-primary font-mono">
            Deterministic Context Packs, Replay Sidecars, and Proposal-Gated AI Workflows
          </p>
          <p className="mt-6 max-w-3xl text-sm sm:text-base text-muted-foreground leading-relaxed">
            Build hashed Context Packs from repositories, separate replay-critical state from
            compressible payload, run explicit policy gates, and preserve model output as
            reviewable proposal artifacts.
          </p>
          <p className="mt-5 font-mono text-xs uppercase tracking-[0.28em] text-muted-foreground">
            Models are providers · Context is the product · Evidence is the interface
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link to="/auth">
              <Button size="lg" className="font-mono gap-2">
                Open reviewer console <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="font-mono">How it works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Demo cards */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground">
            reference flows
          </h2>
          <p className="mt-1 text-xs font-mono text-muted-foreground">
            Three repositories, one pipeline. Pick a demo mode after signing in.
          </p>
          <div className="mt-8 grid md:grid-cols-3 gap-4">
            {DEMO_MODE_LIST.filter((m) => m.id !== "custom").map((m) => (
              <div
                key={m.id}
                className="rounded-lg border border-border bg-card/50 p-5 hover:border-primary/40 transition-colors flex flex-col"
              >
                <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                  {m.shortLabel}
                </p>
                <h3 className="mt-2 font-mono text-base font-semibold">{m.title}</h3>
                <a
                  href={m.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1 font-mono text-[11px] text-muted-foreground hover:text-primary inline-flex items-center gap-1 truncate"
                >
                  <Github className="size-3" /> {m.repoUrl.replace("https://github.com/", "")}
                </a>
                <p className="mt-3 text-xs text-muted-foreground leading-relaxed">{m.blurb}</p>
                <div className="mt-4 space-y-1.5">
                  <p className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">focus</p>
                  <div className="flex flex-wrap gap-1">
                    {m.surfaces.map((s) => (
                      <span key={s} className="font-mono text-[10px] border border-border rounded px-1.5 py-0.5">
                        {s}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pipeline — 8 stages */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-16">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground text-center">
            the pipeline
          </h2>
          <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2">
            {[
              { icon: Terminal,       label: "Inspect",          body: "Tree + metadata from public GitHub." },
              { icon: FileJson,       label: "Context Pack",     body: "Sorted, hashed JSON artifact." },
              { icon: Layers,         label: "Replay Sidecar",   body: "Replay-critical state isolated." },
              { icon: ShieldCheck,    label: "Policy Gate",      body: "Allow/deny, secret scan, caps." },
              { icon: Bot,            label: "Provider Boundary",body: "Untrusted by default." },
              { icon: FileCheck2,     label: "Proposal Artifact",body: "Structured, never auto-applied." },
              { icon: ClipboardCheck, label: "Review Gate",      body: "PASS / NOTES / BLOCKED." },
              { icon: Archive,        label: "Evidence Export",  body: "Rolled-up ledger JSON." },
            ].map((s, i) => (
              <div key={s.label} className="rounded-lg border border-border bg-card/50 p-3 hover:border-primary/40 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                  <s.icon className="size-3.5 text-primary" />
                </div>
                <div className="mt-2 font-mono text-[11px] font-semibold leading-tight">{s.label}</div>
                <p className="mt-1 text-[10px] text-muted-foreground leading-snug">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            the goal
          </p>
          <p className="mt-6 text-3xl sm:text-4xl font-semibold leading-snug">
            Less noisy context.
            <br />
            <span className="text-primary">More verifiable proof.</span>
          </p>
          <p className="mt-6 text-xs font-mono text-muted-foreground max-w-xl mx-auto">
            Context Lab is a reviewer console. It does not certify compliance, attest production
            readiness, or guarantee replay determinism beyond bundled fixtures.
          </p>
        </div>
      </section>

      <section className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h3 className="text-2xl font-semibold">Ready to run a flow?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in, pick a demo mode, and the inspector seeds the rest.
          </p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg" className="font-mono gap-2">
                Open reviewer console <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>comptext / context-lab</span>
          <a href="https://github.com/ProfRandom92/comptext-cli" target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1.5">
            <Github className="size-3" /> source
          </a>
        </div>
      </footer>
    </div>
  );
}
