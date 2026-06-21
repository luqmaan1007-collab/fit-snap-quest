import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { Camera, Users, Sparkles, Footprints } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data } = await supabase.auth.getUser();
    if (data.user) throw redirect({ to: "/dashboard" });
  },
  head: () => ({
    meta: [
      { title: "Snapcal — AI Calorie Tracker" },
      { name: "description", content: "Snap a meal, log instantly. AI-powered calorie, macro and vitamin tracking with friends & groups." },
    ],
  }),
  component: Landing,
});

function Landing() {
  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-md px-6 pt-16 pb-12">
        <div className="text-center">
          <div className="inline-flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
            <Sparkles className="h-3 w-3" /> AI nutrition tracking
          </div>
          <h1 className="mt-6 font-display text-5xl font-bold leading-[0.95] tracking-tight">
            Snap it.<br/>
            <span className="text-gradient-primary">Know it.</span>
          </h1>
          <p className="mt-4 text-base text-muted-foreground">
            Photograph any meal — get calories, macros and vitamins in seconds. Add friends, join groups, race steps.
          </p>
        </div>

        <div className="mt-10 space-y-3">
          <Link to="/onboarding" className="flex w-full items-center justify-center rounded-full bg-primary px-6 py-4 font-semibold text-primary-foreground shadow-lg shadow-primary/20 transition active:scale-[0.98]">
            Get started
          </Link>
          <Link to="/auth" className="flex w-full items-center justify-center rounded-full border border-border bg-card px-6 py-4 font-medium text-foreground transition active:scale-[0.98]">
            I have an account
          </Link>
        </div>

        <div className="mt-14 grid grid-cols-3 gap-3">
          {[
            { icon: Camera, label: "Snap food", sub: "AI nutrition" },
            { icon: Footprints, label: "Sync steps", sub: "Google Fit" },
            { icon: Users, label: "Friends", sub: "Compare days" },
          ].map((f) => (
            <div key={f.label} className="glass-card rounded-2xl p-4 text-center">
              <f.icon className="mx-auto h-5 w-5 text-primary" />
              <div className="mt-2 text-xs font-semibold">{f.label}</div>
              <div className="text-[10px] text-muted-foreground">{f.sub}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
