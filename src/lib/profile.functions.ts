import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";
import { calcTargets } from "./nutrition";

const OnboardingSchema = z.object({
  display_name: z.string().min(1).max(50),
  username: z.string().min(2).max(30).regex(/^[a-zA-Z0-9_]+$/),
  sex: z.enum(["male", "female"]),
  age: z.number().int().min(10).max(110),
  height_cm: z.number().min(80).max(260),
  weight_kg: z.number().min(25).max(400),
  activity_level: z.enum(["sedentary", "light", "moderate", "active", "very_active"]),
  goal: z.enum(["lose", "maintain", "gain"]),
  target_weight_kg: z.number().min(25).max(400),
});

export const getMe = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: profile }, { data: roles }, { data: sub }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
    ]);
    const roleNames = (roles ?? []).map((r) => r.role);
    const isOwner = roleNames.includes("owner");
    const isPro = isOwner || roleNames.includes("pro") || sub?.status === "active";
    return { profile, isPro, isOwner, roles: roleNames };
  });

export const submitOnboarding = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => OnboardingSchema.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId, claims } = context;
    const targets = calcTargets({
      sex: data.sex, age: data.age, height_cm: data.height_cm, weight_kg: data.weight_kg,
      activity: data.activity_level, goal: data.goal,
    });
    const { error } = await supabase.from("profiles").upsert({
      user_id: userId,
      email: (claims as { email?: string }).email,
      ...data,
      ...targets,
      onboarded_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }, { onConflict: "user_id" });
    if (error) throw new Error(error.message);
    return { ok: true, targets };
  });

export const searchUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ query: z.string().min(2).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const q = data.query.toLowerCase();
    const { data: rows } = await supabaseAdmin
      .from("profiles")
      .select("user_id, username, display_name, avatar_url, email")
      .or(`username.ilike.%${q}%,email.ilike.%${q}%,display_name.ilike.%${q}%`)
      .neq("user_id", context.userId)
      .limit(20);
    return rows ?? [];
  });
