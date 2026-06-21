import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getUserDay } from "@/lib/social.functions";
import { Card } from "@/components/ui/card";
import { Ring, MacroBar } from "@/components/Ring";
import { ArrowLeft, Footprints } from "lucide-react";

export const Route = createFileRoute("/_authenticated/friends/$id")({
  head: () => ({ meta: [{ title: "Friend — Snapcal" }] }),
  component: FriendDay,
});

function FriendDay() {
  const { id } = Route.useParams();
  const fn = useServerFn(getUserDay);
  const { data } = useQuery({ queryKey: ["user-day", id], queryFn: () => fn({ data: { user_id: id } }) });
  if (!data) return <div className="p-6 text-muted-foreground">Loading…</div>;
  const { profile, totals, todaySteps } = data;

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <Link to="/friends" className="mb-4 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
      <h1 className="font-display text-2xl font-bold">{profile?.display_name ?? profile?.username ?? "Friend"}</h1>
      <p className="text-xs text-muted-foreground">@{profile?.username}</p>

      <Card className="glass-card mt-5 rounded-3xl border-0 p-6">
        <div className="flex items-center justify-center">
          <Ring value={totals.kcal ?? 0} max={profile?.daily_kcal_target ?? 2000}
            label={`${Math.round(totals.kcal ?? 0)}`} sublabel={`of ${profile?.daily_kcal_target ?? 2000} kcal`} />
        </div>
        <div className="mt-6 space-y-3">
          <MacroBar label="Protein" value={totals.protein_g ?? 0} target={profile?.daily_protein_g} accent="oklch(0.7 0.18 45)" />
          <MacroBar label="Carbs" value={totals.carbs_g ?? 0} target={profile?.daily_carbs_g} accent="oklch(0.75 0.16 80)" />
          <MacroBar label="Fat" value={totals.fat_g ?? 0} target={profile?.daily_fat_g} accent="oklch(0.75 0.16 320)" />
        </div>
      </Card>

      <Card className="glass-card mt-4 flex items-center gap-3 rounded-2xl border-0 p-4">
        <Footprints className="h-8 w-8 text-primary" />
        <div><div className="font-display text-lg font-bold tabular-nums">{todaySteps.toLocaleString()}</div><div className="text-xs text-muted-foreground">steps today</div></div>
      </Card>

      <Card className="glass-card mt-4 grid grid-cols-2 gap-3 rounded-2xl border-0 p-4">
        <MacroBar label="Fiber" value={totals.fiber_g ?? 0} target={28} unit="g" />
        <MacroBar label="Sugar" value={totals.sugar_g ?? 0} target={50} unit="g" />
        <MacroBar label="Sodium" value={totals.sodium_mg ?? 0} target={2300} unit="mg" />
        <MacroBar label="Vit C" value={totals.vit_c_mg ?? 0} target={90} unit="mg" />
        <MacroBar label="Vit D" value={totals.vit_d_mcg ?? 0} target={20} unit="mcg" />
        <MacroBar label="Vit B12" value={totals.vit_b12_mcg ?? 0} target={2.4} unit="mcg" />
        <MacroBar label="Iron" value={totals.iron_mg ?? 0} target={18} unit="mg" />
        <MacroBar label="Calcium" value={totals.calcium_mg ?? 0} target={1000} unit="mg" />
      </Card>
    </div>
  );
}
