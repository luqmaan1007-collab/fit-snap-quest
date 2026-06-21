import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

export const setStepsToday = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ steps: z.number().int().min(0).max(200000) }).parse(d))
  .handler(async ({ data, context }) => {
    const today = new Date().toISOString().slice(0, 10);
    const { error } = await context.supabase.from("step_logs").upsert({
      user_id: context.userId, date: today, steps: data.steps, source: "manual",
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id,date,source" });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getStepHistory = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const since = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const { data } = await context.supabase.from("step_logs").select("date, steps, source")
      .eq("user_id", context.userId).gte("date", since).order("date", { ascending: true });
    // Aggregate per date
    const byDate = new Map<string, number>();
    for (const r of data ?? []) {
      byDate.set(r.date, Math.max(byDate.get(r.date) ?? 0, Number(r.steps)));
    }
    return Array.from(byDate, ([date, steps]) => ({ date, steps }));
  });
