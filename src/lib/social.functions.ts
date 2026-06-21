import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

function todayStart() { const d = new Date(); d.setUTCHours(0,0,0,0); return d.toISOString(); }

export const getDashboard = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const since = todayStart();
    const today = new Date().toISOString().slice(0, 10);

    const [{ data: profile }, { data: logs }, { data: steps }, { data: roles }] = await Promise.all([
      supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", userId).gte("logged_at", since).order("logged_at", { ascending: false }),
      supabase.from("step_logs").select("steps, source").eq("user_id", userId).eq("date", today),
      supabase.from("user_roles").select("role").eq("user_id", userId),
    ]);
    const roleNames = (roles ?? []).map((r) => r.role);
    const isPro = roleNames.includes("pro") || roleNames.includes("owner");
    const totals = (logs ?? []).reduce((acc, l) => {
      for (const k of ["kcal","protein_g","carbs_g","fat_g","fiber_g","sugar_g","sodium_mg","vit_a_mcg","vit_c_mg","vit_d_mcg","vit_b12_mcg","iron_mg","calcium_mg"] as const) {
        acc[k] = (acc[k] ?? 0) + Number(l[k] ?? 0);
      }
      return acc;
    }, {} as Record<string, number>);
    const todaySteps = (steps ?? []).reduce((a, s) => a + Number(s.steps ?? 0), 0);
    return { profile, logs: logs ?? [], totals, todaySteps, isPro, isOwner: roleNames.includes("owner") };
  });

export const sendFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.user_id === userId) throw new Error("Cannot friend yourself");
    const { error } = await supabase.from("friendships").insert({
      requester_id: userId, addressee_id: data.user_id, status: "pending",
    });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { ok: true };
  });

export const respondFriendRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid(), accept: z.boolean() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    if (data.accept) {
      const { error } = await supabase.from("friendships").update({ status: "accepted", updated_at: new Date().toISOString() }).eq("id", data.id).eq("addressee_id", userId);
      if (error) throw new Error(error.message);
    } else {
      const { error } = await supabase.from("friendships").delete().eq("id", data.id).eq("addressee_id", userId);
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listFriends = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: rels } = await supabase.from("friendships").select("*")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`);
    const accepted = (rels ?? []).filter((r) => r.status === "accepted");
    const incoming = (rels ?? []).filter((r) => r.status === "pending" && r.addressee_id === userId);
    const outgoing = (rels ?? []).filter((r) => r.status === "pending" && r.requester_id === userId);

    const friendIds = accepted.map((r) => (r.requester_id === userId ? r.addressee_id : r.requester_id));
    const incomingIds = incoming.map((r) => r.requester_id);
    const outgoingIds = outgoing.map((r) => r.addressee_id);
    const allIds = [...new Set([...friendIds, ...incomingIds, ...outgoingIds])];

    let profiles: Array<{ user_id: string; username: string | null; display_name: string | null; avatar_url: string | null }> = [];
    if (allIds.length) {
      const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
      const { data } = await supabaseAdmin.from("profiles").select("user_id, username, display_name, avatar_url").in("user_id", allIds);
      profiles = data ?? [];
    }
    const byId = new Map(profiles.map((p) => [p.user_id, p]));

    return {
      friends: friendIds.map((id) => byId.get(id)).filter(Boolean),
      incoming: incoming.map((r) => ({ id: r.id, profile: byId.get(r.requester_id) })),
      outgoing: outgoing.map((r) => ({ id: r.id, profile: byId.get(r.addressee_id) })),
    };
  });

export const getUserDay = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ user_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const since = todayStart();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: profile }, { data: logs }, { data: steps }] = await Promise.all([
      supabase.from("profiles").select("user_id, display_name, username, avatar_url, daily_kcal_target, daily_protein_g, daily_carbs_g, daily_fat_g").eq("user_id", data.user_id).maybeSingle(),
      supabase.from("food_logs").select("*").eq("user_id", data.user_id).gte("logged_at", since),
      supabase.from("step_logs").select("steps").eq("user_id", data.user_id).eq("date", today),
    ]);
    const totals = (logs ?? []).reduce((acc, l) => {
      for (const k of ["kcal","protein_g","carbs_g","fat_g","fiber_g","sugar_g","sodium_mg","vit_a_mcg","vit_c_mg","vit_d_mcg","vit_b12_mcg","iron_mg","calcium_mg"] as const) {
        acc[k] = (acc[k] ?? 0) + Number(l[k] ?? 0);
      }
      return acc;
    }, {} as Record<string, number>);
    const todaySteps = (steps ?? []).reduce((a, s) => a + Number(s.steps ?? 0), 0);
    return { profile, totals, todaySteps, logs: logs ?? [] };
  });

function genCode() {
  return Math.random().toString(36).slice(2, 8).toUpperCase();
}

export const createGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ name: z.string().min(1).max(50) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const code = genCode();
    const { data: grp, error } = await supabase.from("groups").insert({ name: data.name, invite_code: code, owner_id: userId }).select().single();
    if (error) throw new Error(error.message);
    await supabase.from("group_members").insert({ group_id: grp.id, user_id: userId });
    return grp;
  });

export const joinGroup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ code: z.string().min(1) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: grp } = await supabaseAdmin.from("groups").select("id").eq("invite_code", data.code.toUpperCase()).maybeSingle();
    if (!grp) throw new Error("Group not found");
    const { error } = await context.supabase.from("group_members").insert({ group_id: grp.id, user_id: context.userId });
    if (error && !error.message.includes("duplicate")) throw new Error(error.message);
    return { group_id: grp.id };
  });

export const listGroups = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { data: memberships } = await supabase.from("group_members").select("group_id").eq("user_id", userId);
    const ids = (memberships ?? []).map((m) => m.group_id);
    if (!ids.length) return [];
    const { data: groups } = await supabase.from("groups").select("*").in("id", ids);
    return groups ?? [];
  });

export const getGroupFeed = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ group_id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabase } = context;
    const { data: members } = await supabase.from("group_members").select("user_id").eq("group_id", data.group_id);
    const memberIds = (members ?? []).map((m) => m.user_id);
    if (!memberIds.length) return { group: null, members: [] };
    const [{ data: group }, { supabaseAdmin: admin }] = await Promise.all([
      supabase.from("groups").select("*").eq("id", data.group_id).maybeSingle(),
      import("@/integrations/supabase/client.server"),
    ]);
    const { data: profiles } = await admin.from("profiles").select("user_id, display_name, username, avatar_url, daily_kcal_target").in("user_id", memberIds);
    const since = todayStart();
    const today = new Date().toISOString().slice(0, 10);
    const [{ data: logs }, { data: steps }] = await Promise.all([
      supabase.from("food_logs").select("user_id, kcal, protein_g, carbs_g, fat_g, vit_c_mg, vit_d_mcg, iron_mg, calcium_mg").in("user_id", memberIds).gte("logged_at", since),
      supabase.from("step_logs").select("user_id, steps").in("user_id", memberIds).eq("date", today),
    ]);
    const stats = memberIds.map((uid) => {
      const ulogs = (logs ?? []).filter((l) => l.user_id === uid);
      const usteps = (steps ?? []).filter((s) => s.user_id === uid).reduce((a, s) => a + Number(s.steps ?? 0), 0);
      const totals = ulogs.reduce((acc, l) => {
        for (const k of ["kcal","protein_g","carbs_g","fat_g","vit_c_mg","vit_d_mcg","iron_mg","calcium_mg"] as const) {
          acc[k] = (acc[k] ?? 0) + Number(l[k] ?? 0);
        }
        return acc;
      }, {} as Record<string, number>);
      return { profile: (profiles ?? []).find((p) => p.user_id === uid), totals, steps: usteps };
    });
    return { group, members: stats };
  });
