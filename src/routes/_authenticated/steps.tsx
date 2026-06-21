import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { getStepHistory, setStepsToday } from "@/lib/steps.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Footprints } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/steps")({
  head: () => ({ meta: [{ title: "Steps — Snapcal" }] }),
  component: Steps,
});

function Steps() {
  const qc = useQueryClient();
  const histFn = useServerFn(getStepHistory);
  const setFn = useServerFn(setStepsToday);
  const { data: history } = useQuery({ queryKey: ["step-history"], queryFn: () => histFn() });
  const today = new Date().toISOString().slice(0, 10);
  const todayRow = history?.find((r) => r.date === today);
  const [steps, setSteps] = useState<string>("");

  const mut = useMutation({
    mutationFn: (n: number) => setFn({ data: { steps: n } }),
    onSuccess: () => {
      toast.success("Steps updated");
      qc.invalidateQueries({ queryKey: ["step-history"] });
      qc.invalidateQueries({ queryKey: ["dashboard"] });
      setSteps("");
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const max = Math.max(10000, ...(history?.map((h) => h.steps) ?? [0]));

  return (
    <div className="mx-auto max-w-md px-5 pt-8">
      <h1 className="font-display text-2xl font-bold">Steps</h1>

      <Card className="glass-card mt-6 rounded-3xl border-0 p-6 text-center">
        <Footprints className="mx-auto h-8 w-8 text-primary" />
        <div className="mt-3 font-display text-5xl font-bold tabular-nums">{(todayRow?.steps ?? 0).toLocaleString()}</div>
        <div className="text-xs text-muted-foreground">steps today · goal 10,000</div>
        <div className="mx-auto mt-5 h-2 max-w-xs overflow-hidden rounded-full bg-muted">
          <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${Math.min(100, ((todayRow?.steps ?? 0)/10000)*100)}%` }} />
        </div>
      </Card>

      <Card className="glass-card mt-4 rounded-3xl border-0 p-5">
        <div className="text-sm font-medium">Last 7 days</div>
        <div className="mt-4 flex items-end justify-between gap-2 pr-1">
          {(history ?? []).slice(-7).map((d) => (
            <div key={d.date} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full overflow-hidden rounded-lg bg-muted" style={{ height: 120 }}>
                <div className="ml-auto h-full w-full bg-primary transition-all" style={{ height: `${(d.steps / max) * 100}%`, marginTop: `${100 - (d.steps / max) * 100}%` }} />
              </div>
              <div className="text-[10px] text-muted-foreground">{new Date(d.date).toLocaleDateString(undefined, { weekday: "narrow" })}</div>
            </div>
          ))}
          {Array.from({ length: Math.max(0, 7 - (history?.length ?? 0)) }).map((_, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-2">
              <div className="w-full rounded-lg bg-muted/40" style={{ height: 120 }} />
              <div className="text-[10px] text-muted-foreground">–</div>
            </div>
          ))}
        </div>
      </Card>

      <Card className="glass-card mt-4 rounded-3xl border-0 p-5">
        <div className="text-sm font-medium">Log steps manually</div>
        <p className="mt-1 text-xs text-muted-foreground">Or sync your fitness tracker daily count.</p>
        <div className="mt-3 flex gap-2">
          <Input type="number" inputMode="numeric" placeholder="e.g. 8432" value={steps} onChange={(e) => setSteps(e.target.value)} />
          <Button className="rounded-full bg-primary text-primary-foreground" onClick={() => steps && mut.mutate(Number(steps))} disabled={mut.isPending}>Save</Button>
        </div>
      </Card>

      <Card className="glass-card mt-4 rounded-3xl border-0 p-5">
        <div className="text-sm font-medium">Connect Google Fit</div>
        <p className="mt-1 text-xs text-muted-foreground">Auto-sync your daily step count from Google Fit. Requires Google OAuth setup — coming soon.</p>
        <Button variant="outline" className="mt-3 w-full rounded-full" disabled>Connect Google Fit</Button>
      </Card>
    </div>
  );
}
