import { createFileRoute, useNavigate, redirect } from "@tanstack/react-router";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { toast } from "sonner";

export const Route = createFileRoute("/auth")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({ meta: [{ title: "Sign in — Snapcal" }] }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");

  async function signIn() {
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) return toast.error(error.message);
    navigate({ to: "/dashboard" });
  }

  async function signUp() {
    setLoading(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin + "/dashboard",
        data: { full_name: name },
      },
    });
    setLoading(false);
    if (error) return toast.error(error.message);
    toast.success("Account created!");
    navigate({ to: "/onboarding" });
  }

  async function google() {
    const res = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin + "/dashboard" });
    if (res.error) toast.error("Google sign-in failed");
  }

  return (
    <div className="min-h-screen bg-background px-6 py-10">
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-3xl font-bold">Welcome</h1>
        <p className="mt-1 text-sm text-muted-foreground">Sign in or create your Snapcal account.</p>

        <Tabs defaultValue="signin" className="mt-6">
          <TabsList className="grid w-full grid-cols-2"><TabsTrigger value="signin">Sign in</TabsTrigger><TabsTrigger value="signup">Sign up</TabsTrigger></TabsList>
          <TabsContent value="signin" className="mt-5 space-y-4">
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button onClick={signIn} disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground" size="lg">Sign in</Button>
          </TabsContent>
          <TabsContent value="signup" className="mt-5 space-y-4">
            <div><Label>Name</Label><Input value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label>Email</Label><Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label>Password</Label><Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button onClick={signUp} disabled={loading} className="w-full rounded-full bg-primary text-primary-foreground" size="lg">Create account</Button>
          </TabsContent>
        </Tabs>

        <div className="mt-6 flex items-center gap-3">
          <div className="h-px flex-1 bg-border" /><span className="text-xs text-muted-foreground">OR</span><div className="h-px flex-1 bg-border" />
        </div>
        <Button onClick={google} variant="outline" className="mt-4 w-full rounded-full" size="lg">Continue with Google</Button>
      </div>
    </div>
  );
}
