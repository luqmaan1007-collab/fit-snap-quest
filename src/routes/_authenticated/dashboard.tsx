import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, queryOptions } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getDashboard } from "@/lib/social.functions";
import { Ring, MacroBar } from "@/components/Ring";
import { Card } from "@/components/ui/card";
import { Camera, Flame, Beef, Wheat, Droplet, Footprints, Sparkles } from "lucide-react";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ title: "Today — Snapcal" }] }),
  loader: ({ context }) => context.queryClient.ensureQueryData(dashOpts()),
  component: Dashboard,
});

function dashOpts() {
  return queryOptions({
    queryKey: ["dashboard"],
    queryFn: () => getDashboardFn(),
  });
}
let getDashboardFn: () => ReturnType<typeof getDashboard> = () => { throw new Error("not ready"); };

function Dashboard() {
  const fn = useServerFn(getDashboard);
  getDashboardFn = fn;
  const { data } = useQuery({ queryKey: ["dashboard"], queryFn: () => fn() });
  if (!data) return <div className="p-6 text-muted-foreground">Loading…</div>;

  const { profile, logs, totals, todaySteps, isOwner, isPro } = data;
  const kcalTarget = profile?.daily_kcal_target ?? 2000;

  if (!profile?.onboarded_at) {
    return (
      <div className="mx-auto max-w-md px-6 py-10 text-center">
        <h1 className="font-display text-2xl font-bold">Finish setup</h1>
        <p className="mt-2 text-sm text-muted-foreground">Complete the quick questionnaire so we can set your targets.</p>
        <Link to="/onboarding" className="mt-6 inline-flex rounded-full bg-primary px-6 py-3 font-medium text-primary-foreground">Continue setup</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <div className="flex items-center justify-between">
        <div>
          <div className="text-xs text-muted-foreground">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}</div>
          <h1 className="font-display text-2xl font-bold">Hi, {profile.display_name?.split(" ")[0] ?? "there"}</h1>
        </div>
        {(isOwner || isPro) && (
          <span className="inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-3 w-3" /> {isOwner ? "Owner" : "Pro"}
          </span>
        )}
      </div>

      <Card className="glass-card mt-6 rounded-3xl border-0 p-6">
        <div className="flex items-center justify-center">
          <Ring value={totals.kcal ?? 0} max={kcalTarget}
            label={`${Math.round(totals.kcal ?? 0)}`}
            sublabel={`of ${kcalTarget} kcal`} />
        </div>
        <div className="mt-6 space-y-3">
          <MacroBar label="Protein" value={totals.protein_g ?? 0} target={profile.daily_protein_g} accent="oklch(0.7 0.18 45)" />
          <MacroBar label="Carbs" value={totals.carbs_g ?? 0} target={profile.daily_carbs_g} accent="oklch(0.75 0.16 80)" />
          <MacroBar label="Fat" value={totals.fat_g ?? 0} target={profile.daily_fat_g} accent="oklch(0.75 0.16 320)" />
        </div>
      </Card>

      <div className="mt-4 grid grid-cols-2 gap-3">
        <Card className="glass-card flex items-center gap-3 rounded-2xl border-0 p-4">
          <Footprints className="h-8 w-8 text-primary" />
          <div><div className="font-display text-lg font-bold tabular-nums">{todaySteps.toLocaleString()}</div><div className="text-xs text-muted-foreground">steps today</div></div>
        </Card>
        <Card className="glass-card flex items-center gap-3 rounded-2xl border-0 p-4">
          <Flame className="h-8 w-8 text-accent" />
          <div><div className="font-display text-lg font-bold tabular-nums">{logs.length}</div><div className="text-xs text-muted-foreground">meals snapped</div></div>
        </Card>
      </div>

      <div className="mt-5">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-display text-lg font-semibold">Vitamins & minerals</h2>
        </div>
        <Card className="glass-card grid grid-cols-2 gap-3 rounded-2xl border-0 p-4">
          <MacroBar label="Fiber" value={totals.fiber_g ?? 0} target={28} unit="g" accent="oklch(0.7 0.15 160)" />
          <MacroBar label="Sugar" value={totals.sugar_g ?? 0} target={50} unit="g" accent="oklch(0.7 0.18 25)" />
          <MacroBar label="Sodium" value={totals.sodium_mg ?? 0} target={2300} unit="mg" accent="oklch(0.7 0.15 200)" />
          <MacroBar label="Vit C" value={totals.vit_c_mg ?? 0} target={90} unit="mg" accent="oklch(0.8 0.16 60)" />
          <MacroBar label="Vit D" value={totals.vit_d_mcg ?? 0} target={20} unit="mcg" accent="oklch(0.8 0.15 90)" />
          <MacroBar label="Vit B12" value={totals.vit_b12_mcg ?? 0} target={2.4} unit="mcg" accent="oklch(0.7 0.15 280)" />
          <MacroBar label="Iron" value={totals.iron_mg ?? 0} target={18} unit="mg" accent="oklch(0.65 0.18 30)" />
          <MacroBar label="Calcium" value={totals.calcium_mg ?? 0} target={1000} unit="mg" accent="oklch(0.85 0.05 240)" />
        </Card>
      </div>

      <div className="mt-6 mb-4">
        <h2 className="mb-3 font-display text-lg font-semibold">Today's meals</h2>
        {logs.length === 0 ? (
          <Link to="/snap" className="glass-card flex flex-col items-center gap-2 rounded-2xl border-0 p-8 text-center">
            <Camera className="h-8 w-8 text-primary" />
            <div className="font-medium">Snap your first meal</div>
            <div className="text-xs text-muted-foreground">AI analyses it instantly</div>
          </Link>
        ) : (
          <div className="space-y-2">
            {logs.map((l) => (
              <Card key={l.id} className="glass-card flex items-center gap-3 rounded-2xl border-0 p-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/15 text-primary">
                  {l.kcal > 600 ? <Flame className="h-5 w-5" /> : l.protein_g > 25 ? <Beef className="h-5 w-5" /> : l.carbs_g > 50 ? <Wheat className="h-5 w-5" /> : <Droplet className="h-5 w-5" />}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{l.name}</div>
                  <div className="text-xs text-muted-foreground">{Math.round(l.kcal)} kcal · P{Math.round(l.protein_g)} C{Math.round(l.carbs_g)} F{Math.round(l.fat_g)}</div>
                </div>
                <div className="text-[10px] text-muted-foreground">{new Date(l.logged_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
