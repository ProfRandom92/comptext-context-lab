import { createFileRoute, Link } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Github } from "lucide-react";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — CompText Web" },
      { name: "description", content: "Why CompText exists and what this web adaptation does differently from the CLI." },
      { property: "og:title", content: "About CompText Web" },
      { property: "og:description", content: "Why CompText exists and what this web adaptation does." },
    ],
  }),
  component: About,
});

function About() {
  return (
    <div className="min-h-screen">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> back
          </Link>
          <Link to="/auth"><Button size="sm" className="font-mono">sign in</Button></Link>
        </div>
      </header>
      <article className="mx-auto max-w-3xl px-4 py-16 prose prose-invert">
        <h1 className="text-4xl font-bold">About CompText Web</h1>
        <p className="text-muted-foreground mt-4">
          CompText is an experimental approach to AI-assisted engineering. The original
          <a className="text-primary mx-1" href="https://github.com/ProfRandom92/comptext-cli" target="_blank" rel="noreferrer">
            comptext-cli
          </a>
          is a local-first Rust binary (<code className="font-mono">ctxt</code>) that builds
          deterministic Context Packs and gates every model interaction with reviewable
          artifacts.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">What this web app is</h2>
        <p className="text-muted-foreground mt-2">
          A browser adaptation of the same pipeline: <span className="font-mono">inspect → pack → gate → provider → proposal → review → artifacts</span>.
          You give it a public GitHub repo URL and a task. It builds a sorted, hashed
          Context Pack, runs a policy gate (allow/deny globs, size caps, secret scan), then
          asks Lovable AI for a structured proposal. You decide PASS, NOTES, or BLOCKED.
        </p>

        <h2 className="mt-10 text-2xl font-semibold">What it is not</h2>
        <ul className="mt-2 text-muted-foreground space-y-1">
          <li>– Not a local CLI. It cannot run <code className="font-mono">cargo</code> or touch your filesystem.</li>
          <li>– Not an apply gate. Proposals are reviewable artifacts only, never mutations.</li>
          <li>– Not provider-agnostic yet. The browser cannot reach a local Ollama instance.</li>
          <li>– Not a replacement for the CLI. It is a complementary surface for review and exploration.</li>
        </ul>

        <h2 className="mt-10 text-2xl font-semibold">Source</h2>
        <p className="text-muted-foreground mt-2">
          The CLI lives at{" "}
          <a className="text-primary inline-flex items-center gap-1" href="https://github.com/ProfRandom92/comptext-cli" target="_blank" rel="noreferrer">
            <Github className="size-3.5" /> ProfRandom92/comptext-cli
          </a>
          . This web app implements the same ideas: deterministic, portable, verifiable.
        </p>
      </article>
    </div>
  );
}
