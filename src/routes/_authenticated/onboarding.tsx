import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { submitOnboarding, getMe } from "@/lib/profile.functions";
import { useServerFn as useFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/_authenticated/onboarding")({
  head: () => ({ meta: [{ title: "Setup — Snapcal" }] }),
  component: Onboarding,
});

type Form = {
  display_name: string; username: string;
  sex: "male" | "female"; age: number; height_cm: number; weight_kg: number;
  activity_level: "sedentary" | "light" | "moderate" | "active" | "very_active";
  goal: "lose" | "maintain" | "gain"; target_weight_kg: number;
};

function Onboarding() {
  const navigate = useNavigate();
  const fn = useFn(submitOnboarding);
  const getMeFn = useFn(getMe);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<Form>({
    display_name: "", username: "", sex: "male", age: 25, height_cm: 175, weight_kg: 70,
    activity_level: "moderate", goal: "maintain", target_weight_kg: 70,
  });

  // Pre-fill from existing profile
  useState(() => {
    getMeFn().then((me) => {
      if (me.profile) {
        setForm((f) => ({
          ...f,
          display_name: me.profile?.display_name ?? "",
          username: me.profile?.username ?? "",
          age: me.profile?.age ?? f.age,
          sex: (me.profile?.sex as Form["sex"]) ?? f.sex,
          height_cm: Number(me.profile?.height_cm) || f.height_cm,
          weight_kg: Number(me.profile?.weight_kg) || f.weight_kg,
          activity_level: (me.profile?.activity_level as Form["activity_level"]) ?? f.activity_level,
          goal: (me.profile?.goal as Form["goal"]) ?? f.goal,
          target_weight_kg: Number(me.profile?.target_weight_kg) || f.target_weight_kg,
        }));
      }
    }).catch(() => {});
    return 0;
  });

  const mut = useMutation({
    mutationFn: () => fn({ data: form }),
    onSuccess: () => { toast.success("All set!"); navigate({ to: "/dashboard" }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const steps = ["Profile", "Body", "Activity", "Goal"];
  const last = step === steps.length - 1;

  return (
    <div className="mx-auto max-w-md px-6 py-8">
      <div className="flex gap-1.5">
        {steps.map((_, i) => (
          <div key={i} className={cn("h-1.5 flex-1 rounded-full", i <= step ? "bg-primary" : "bg-muted")} />
        ))}
      </div>
      <h2 className="mt-6 font-display text-2xl font-bold">{steps[step]}</h2>

      <div className="mt-6 space-y-5">
        {step === 0 && <>
          <div><Label>Your name</Label><Input value={form.display_name} onChange={(e) => setForm({...form, display_name: e.target.value})} placeholder="Alex" /></div>
          <div><Label>Username (friends find you with this)</Label><Input value={form.username} onChange={(e) => setForm({...form, username: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,"")})} placeholder="alex_runs" /></div>
        </>}
        {step === 1 && <>
          <div>
            <Label>Sex</Label>
            <div className="mt-2 grid grid-cols-2 gap-2">
              {(["male","female"] as const).map((s) => (
                <button key={s} onClick={() => setForm({...form, sex: s})}
                  className={cn("rounded-2xl border px-4 py-3 text-sm font-medium capitalize transition",
                    form.sex === s ? "border-primary bg-primary/10 text-primary" : "border-border")}>{s}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <NumberField label="Age" value={form.age} onChange={(v) => setForm({...form, age: v})} />
            <NumberField label="Height (cm)" value={form.height_cm} onChange={(v) => setForm({...form, height_cm: v})} />
            <NumberField label="Weight (kg)" value={form.weight_kg} onChange={(v) => setForm({...form, weight_kg: v})} />
          </div>
        </>}
        {step === 2 && <div className="space-y-2">
          {[
            ["sedentary","Sedentary","Office job, little exercise"],
            ["light","Light","1-3 days/week"],
            ["moderate","Moderate","3-5 days/week"],
            ["active","Active","6-7 days/week"],
            ["very_active","Athlete","Twice daily / heavy training"],
          ].map(([k,t,s]) => (
            <button key={k} onClick={() => setForm({...form, activity_level: k as Form["activity_level"]})}
              className={cn("flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition",
                form.activity_level === k ? "border-primary bg-primary/10" : "border-border")}>
              <div><div className="font-medium">{t}</div><div className="text-xs text-muted-foreground">{s}</div></div>
            </button>
          ))}
        </div>}
        {step === 3 && <>
          <div>
            <Label>Goal</Label>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["lose","maintain","gain"] as const).map((g) => (
                <button key={g} onClick={() => setForm({...form, goal: g})}
                  className={cn("rounded-2xl border px-3 py-3 text-sm font-medium capitalize transition",
                    form.goal === g ? "border-primary bg-primary/10 text-primary" : "border-border")}>{g}</button>
              ))}
            </div>
          </div>
          <NumberField label="Target weight (kg)" value={form.target_weight_kg} onChange={(v) => setForm({...form, target_weight_kg: v})} />
        </>}
      </div>

      <div className="mt-8 flex gap-3">
        {step > 0 && <Button variant="outline" className="flex-1 rounded-full" size="lg" onClick={() => setStep(step - 1)}>Back</Button>}
        <Button className="flex-1 rounded-full bg-primary text-primary-foreground" size="lg"
          disabled={mut.isPending || (step === 0 && (!form.display_name || form.username.length < 2))}
          onClick={() => { if (last) mut.mutate(); else setStep(step + 1); }}>
          {last ? (mut.isPending ? "Saving…" : "Finish") : "Continue"}
        </Button>
      </div>
    </div>
  );
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div>
      <Label className="text-xs">{label}</Label>
      <Input type="number" inputMode="numeric" value={value} onChange={(e) => onChange(Number(e.target.value) || 0)} />
    </div>
  );
}
