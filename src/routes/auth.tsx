import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Terminal, ArrowLeft } from "lucide-react";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — CompText Web" },
      { name: "description", content: "Sign in or create an account for CompText Web." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/workspace" });
    });
  }, [navigate]);

  const signIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Signed in");
    navigate({ to: "/workspace" });
  };

  const signUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/workspace` },
    });
    setBusy(false);
    if (error) return toast.error(error.message);
    toast.success("Check your inbox to confirm");
  };

  const google = async () => {
    setBusy(true);
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: `${window.location.origin}/workspace` });
    if (result.error) {
      setBusy(false);
      toast.error(result.error instanceof Error ? result.error.message : String(result.error));
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/workspace" });
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/60">
        <div className="mx-auto max-w-6xl px-4 h-14 flex items-center">
          <Link to="/" className="inline-flex items-center gap-1.5 text-sm font-mono text-muted-foreground hover:text-foreground">
            <ArrowLeft className="size-3.5" /> back
          </Link>
        </div>
      </header>
      <div className="flex-1 flex items-center justify-center px-4 py-16 bg-grid">
        <Card className="w-full max-w-md border-border/80 backdrop-blur bg-card/80">
          <CardHeader>
            <div className="flex items-center gap-2 mb-2">
              <Terminal className="size-4 text-primary" />
              <span className="font-mono text-sm font-bold">comptext/web</span>
            </div>
            <CardTitle>Access your workspace</CardTitle>
            <CardDescription>Sign in to start a deterministic context session.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button onClick={google} disabled={busy} variant="outline" className="w-full font-mono">
              Continue with Google
            </Button>
            <div className="my-4 flex items-center gap-3 text-xs text-muted-foreground font-mono">
              <div className="h-px flex-1 bg-border" /> or email <div className="h-px flex-1 bg-border" />
            </div>
            <Tabs defaultValue="signin">
              <TabsList className="grid w-full grid-cols-2 font-mono">
                <TabsTrigger value="signin">sign in</TabsTrigger>
                <TabsTrigger value="signup">sign up</TabsTrigger>
              </TabsList>
              <TabsContent value="signin">
                <form onSubmit={signIn} className="space-y-3 pt-4">
                  <Field id="si-email" label="email" type="email" value={email} onChange={setEmail} />
                  <Field id="si-pw" label="password" type="password" value={password} onChange={setPassword} />
                  <Button type="submit" disabled={busy} className="w-full font-mono">Sign in</Button>
                </form>
              </TabsContent>
              <TabsContent value="signup">
                <form onSubmit={signUp} className="space-y-3 pt-4">
                  <Field id="su-email" label="email" type="email" value={email} onChange={setEmail} />
                  <Field id="su-pw" label="password (min 6)" type="password" value={password} onChange={setPassword} />
                  <Button type="submit" disabled={busy} className="w-full font-mono">Create account</Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Field({ id, label, type, value, onChange }: { id: string; label: string; type: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="font-mono text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input id={id} type={type} value={value} onChange={(e) => onChange(e.target.value)} required className="font-mono" />
    </div>
  );
}
