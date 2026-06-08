import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { Terminal, FileJson, ShieldCheck, Bot, FileCheck2, Archive, ArrowRight, Github } from "lucide-react";
import { BrandIcon, BrandLogo } from "@/components/BrandLogo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Comptext — The Operating System for Context" },
      { name: "description", content: "Turn a GitHub repo into a deterministic Context Pack, run it through a policy gate, then a proposal-gated AI workflow — all in the browser." },
      { property: "og:title", content: "Comptext — The Operating System for Context" },
      { property: "og:description", content: "Deterministic. Portable. Verifiable. Models are providers — context is the product." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen flex flex-col">
      {/* Top bar */}
      <header className="border-b border-border/60 bg-background/80 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5">
            <BrandIcon className="size-7" />
            <BrandLogo className="h-3.5" alt="Comptext" />
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">/web</span>
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

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border/60">
        <div className="absolute inset-0 bg-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
        <div className="relative mx-auto max-w-6xl px-4 py-20 sm:py-28 text-center">
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs font-mono text-muted-foreground mb-8">
            <span className="size-1.5 rounded-full bg-primary animate-pulse" />
            web adaptation of comptext-cli · phase 1
          </div>
          <div className="flex justify-center mb-6">
            <BrandLogo className="h-20 sm:h-28" />
          </div>
          <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
            The Operating System
            <br />
            <span className="text-primary">for Context.</span>
          </h1>
          <p className="mt-6 max-w-2xl mx-auto text-lg text-muted-foreground">
            Turn a messy repository into a deterministic Context Pack. Pass it through an explicit
            policy gate. Treat model output as untrusted. Review proposals before anything moves.
          </p>
          <p className="mt-4 font-mono text-xs uppercase tracking-[0.32em] text-muted-foreground">
            Deterministic · Portable · Verifiable
          </p>
          <div className="mt-10 flex flex-wrap justify-center gap-3">
            <Link to="/auth">
              <Button size="lg" className="font-mono gap-2">
                Start a session <ArrowRight className="size-4" />
              </Button>
            </Link>
            <Link to="/about">
              <Button size="lg" variant="outline" className="font-mono">How it works</Button>
            </Link>
          </div>
        </div>
      </section>

      {/* Pipeline */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 py-20">
          <h2 className="text-sm font-mono uppercase tracking-widest text-muted-foreground text-center">
            The pipeline
          </h2>
          <div className="mt-10 grid sm:grid-cols-2 lg:grid-cols-6 gap-3">
            {[
              { icon: Terminal, label: "Inspect", body: "Pull tree + files from a public GitHub repo." },
              { icon: FileJson, label: "Context Pack", body: "Sorted, hashed JSON artifact." },
              { icon: ShieldCheck, label: "Policy Gate", body: "Allow/deny globs, secret scan, size caps." },
              { icon: Bot, label: "Provider", body: "Lovable AI — treated as untrusted." },
              { icon: FileCheck2, label: "Proposal", body: "Structured plan + diffs, never auto-applied." },
              { icon: Archive, label: "Artifacts", body: "Reviewable history of every gate." },
            ].map((s, i) => (
              <div
                key={s.label}
                className="relative rounded-lg border border-border bg-card/50 p-5 hover:border-primary/40 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] text-muted-foreground">0{i + 1}</span>
                  <s.icon className="size-4 text-primary" />
                </div>
                <div className="mt-3 font-mono text-sm font-semibold">{s.label}</div>
                <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{s.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Tagline */}
      <section className="border-b border-border/60">
        <div className="mx-auto max-w-4xl px-4 py-24 text-center">
          <p className="font-mono text-xs uppercase tracking-widest text-muted-foreground">
            The goal
          </p>
          <p className="mt-6 text-3xl sm:text-4xl font-semibold leading-snug">
            Less noisy context.
            <br />
            <span className="text-primary">More verifiable proof.</span>
          </p>
        </div>
      </section>

      {/* CTA */}
      <section className="flex-1">
        <div className="mx-auto max-w-4xl px-4 py-20 text-center">
          <h3 className="text-2xl font-semibold">Ready to inspect a repo?</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Sign in to start your first deterministic context session.
          </p>
          <div className="mt-6">
            <Link to="/auth">
              <Button size="lg" className="font-mono gap-2">
                Open workspace <ArrowRight className="size-4" />
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <footer className="border-t border-border/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between text-xs font-mono text-muted-foreground">
          <span>comptext/web · web adaptation</span>
          <a href="https://github.com/ProfRandom92/comptext-cli" target="_blank" rel="noreferrer" className="hover:text-foreground inline-flex items-center gap-1.5">
            <Github className="size-3" /> source
          </a>
        </div>
      </footer>
    </div>
  );
}
