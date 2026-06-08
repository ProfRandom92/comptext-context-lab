import { Link, useRouter } from "@tanstack/react-router";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { type ReactNode } from "react";
import { BrandIcon, BrandLogo } from "@/components/BrandLogo";

export function AppShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const signOut = async () => {
    await supabase.auth.signOut();
    router.navigate({ to: "/" });
  };
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60 bg-card/40 backdrop-blur sticky top-0 z-30">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2.5 group">
            <BrandIcon className="size-7 transition-transform group-hover:scale-105" />
            <BrandLogo className="h-3.5" alt="Comptext" />
            <span className="text-xs text-muted-foreground font-mono hidden sm:inline">/web</span>
          </Link>
          <nav className="flex items-center gap-1 text-sm font-mono">
            <NavLink to="/workspace">workspace</NavLink>
            <NavLink to="/inspect">inspect</NavLink>
            <NavLink to="/artifacts">artifacts</NavLink>
            <Button variant="ghost" size="sm" onClick={signOut} className="ml-2 gap-1.5 text-muted-foreground hover:text-foreground">
              <LogOut className="size-3.5" />
              <span className="hidden sm:inline">logout</span>
            </Button>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
    </div>
  );
}

function NavLink({ to, children }: { to: string; children: ReactNode }) {
  return (
    <Link
      to={to}
      className="px-3 py-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary transition-colors"
      activeProps={{ className: "px-3 py-1.5 rounded-md text-primary bg-secondary" }}
    >
      {children}
    </Link>
  );
}

export function GateBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    pass: "bg-pass/15 text-pass border-pass/30",
    blocked: "bg-blocked/15 text-blocked border-blocked/30",
    notes: "bg-warn/15 text-warn border-warn/30",
  };
  return (
    <span className={`inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-mono uppercase tracking-wide ${map[status] ?? "bg-muted text-muted-foreground border-border"}`}>
      <span className="size-1.5 rounded-full bg-current" />
      {status}
    </span>
  );
}
