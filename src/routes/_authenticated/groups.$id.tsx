import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getGroupFeed } from "@/lib/social.functions";
import { Card } from "@/components/ui/card";
import { MacroBar } from "@/components/Ring";
import { ArrowLeft, Footprints, Users } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/groups/$id")({
  head: () => ({ meta: [{ title: "Group — Snapcal" }] }),
  component: GroupPage,
});

function GroupPage() {
  const { id } = Route.useParams();
  const fn = useServerFn(getGroupFeed);
  const { data } = useQuery({ queryKey: ["group", id], queryFn: () => fn({ data: { group_id: id } }) });
  if (!data) return <div className="p-6 text-muted-foreground">Loading…</div>;

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <Link to="/groups" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground"><ArrowLeft className="h-4 w-4" />Back</Link>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold">{data.group?.name ?? "Group"}</h1>
          <div className="text-xs text-muted-foreground">{data.members.length} members</div>
        </div>
        <button onClick={() => { navigator.clipboard.writeText(data.group?.invite_code ?? ""); toast.success("Code copied"); }}
          className="rounded-full border border-border bg-card px-3 py-1.5 font-mono text-xs">{data.group?.invite_code}</button>
      </div>

      <div className="mt-5 space-y-3 pb-6">
        {data.members.map((m, i) => m.profile && (
          <Card key={i} className="glass-card rounded-2xl border-0 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/20 text-sm font-semibold text-primary">
                {(m.profile.display_name ?? m.profile.username ?? "?").charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-medium">{m.profile.display_name ?? m.profile.username}</div>
                <div className="text-xs text-muted-foreground">{Math.round(m.totals.kcal ?? 0)} / {m.profile.daily_kcal_target ?? 2000} kcal</div>
              </div>
              <div className="flex items-center gap-1 text-xs text-muted-foreground"><Footprints className="h-3.5 w-3.5" />{m.steps.toLocaleString()}</div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              <MacroBar label="Protein" value={m.totals.protein_g ?? 0} target={null} unit="g" accent="oklch(0.7 0.18 45)" />
              <MacroBar label="Carbs" value={m.totals.carbs_g ?? 0} target={null} unit="g" accent="oklch(0.75 0.16 80)" />
              <MacroBar label="Fat" value={m.totals.fat_g ?? 0} target={null} unit="g" accent="oklch(0.75 0.16 320)" />
              <MacroBar label="Vit C" value={m.totals.vit_c_mg ?? 0} target={90} unit="mg" />
              <MacroBar label="Iron" value={m.totals.iron_mg ?? 0} target={18} unit="mg" />
              <MacroBar label="Calcium" value={m.totals.calcium_mg ?? 0} target={1000} unit="mg" />
            </div>
          </Card>
        ))}
        {!data.members.length && <div className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground"><Users className="mx-auto mb-2 h-6 w-6" />No members yet.</div>}
      </div>
    </div>
  );
}
