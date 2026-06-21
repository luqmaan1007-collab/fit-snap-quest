import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getMe } from "@/lib/profile.functions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { signOut } from "@/lib/auth";
import { Sparkles, LogOut, User, Crown } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/settings")({
  head: () => ({ meta: [{ title: "Settings — Snapcal" }] }),
  component: Settings,
});

function Settings() {
  const navigate = useNavigate();
  const fn = useServerFn(getMe);
  const { data } = useQuery({ queryKey: ["me"], queryFn: () => fn() });

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <h1 className="font-display text-2xl font-bold">Me</h1>

      <Card className="glass-card mt-5 rounded-2xl border-0 p-5">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/20 text-lg font-semibold text-primary">
            {(data?.profile?.display_name ?? "?").charAt(0).toUpperCase()}
          </div>
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">{data?.profile?.display_name ?? "—"}</div>
            <div className="truncate text-xs text-muted-foreground">@{data?.profile?.username ?? "—"} · {data?.profile?.email}</div>
          </div>
          {data?.isOwner && <Crown className="h-5 w-5 text-primary" />}
        </div>
        <Button variant="outline" className="mt-4 w-full rounded-full" onClick={() => navigate({ to: "/onboarding" })}><User className="mr-2 h-4 w-4" />Edit profile & targets</Button>
      </Card>

      <Card className="glass-card mt-4 rounded-2xl border-0 p-5">
        {data?.isOwner ? (
          <>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><Crown className="h-3 w-3" /> Owner</div>
            <div className="mt-3 font-display text-lg font-semibold">Unlimited everything</div>
            <p className="mt-1 text-xs text-muted-foreground">All Pro features enabled — no daily snap limits.</p>
          </>
        ) : data?.isPro ? (
          <>
            <div className="inline-flex items-center gap-1 rounded-full bg-primary/20 px-3 py-1 text-xs font-bold uppercase tracking-wider text-primary"><Sparkles className="h-3 w-3" /> Pro</div>
            <div className="mt-3 font-display text-lg font-semibold">Unlimited snaps active</div>
            <p className="mt-1 text-xs text-muted-foreground">Thanks for supporting Snapcal!</p>
          </>
        ) : (
          <>
            <div className="font-display text-lg font-semibold">Upgrade to Pro</div>
            <ul className="mt-2 space-y-1.5 text-sm">
              <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" />Unlimited daily snaps</li>
              <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" />Priority AI analysis</li>
              <li className="flex items-center gap-2"><Sparkles className="h-3.5 w-3.5 text-primary" />Advanced micronutrient tracking</li>
            </ul>
            <Button className="mt-4 w-full rounded-full bg-primary text-primary-foreground" size="lg"
              onClick={() => toast.info("Payments will be enabled with Stripe — coming next.")}>Upgrade — coming soon</Button>
          </>
        )}
      </Card>

      <Button variant="ghost" className="mt-6 w-full text-destructive" onClick={async () => { await signOut(); navigate({ to: "/" }); }}>
        <LogOut className="mr-2 h-4 w-4" />Sign out
      </Button>
      <div className="mt-10 text-center text-[10px] text-muted-foreground">Snapcal · AI nutrition tracking</div>
    </div>
  );
}
