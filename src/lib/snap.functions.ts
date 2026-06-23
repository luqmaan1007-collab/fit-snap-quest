import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const SnapInput = z.object({
  imageBase64: z.string().min(100), // data:image/...;base64,XXXX or raw base64
  mime: z.string().default("image/jpeg"),
});

const FREE_DAILY_LIMIT = 3;

function startOfTodayIso() {
  const d = new Date();
  d.setUTCHours(0, 0, 0, 0);
  return d.toISOString();
}

function todayUtcDate() {
  return new Date().toISOString().slice(0, 10);
}

export const getSnapQuota = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const [{ data: roles }, { count: used }, { count: bonus }] = await Promise.all([
      supabase.from("user_roles").select("role").eq("user_id", userId),
      supabase.from("food_logs").select("*", { count: "exact", head: true })
        .eq("user_id", userId).gte("logged_at", startOfTodayIso()),
      supabase.from("snap_bonuses").select("*", { count: "exact", head: true })
        .eq("user_id", userId).eq("earned_on", todayUtcDate()),
    ]);
    const roleNames = (roles ?? []).map((r) => r.role);
    const unlimited = roleNames.includes("pro") || roleNames.includes("owner");
    const limit = unlimited ? null : FREE_DAILY_LIMIT + (bonus ?? 0);
    return { used: used ?? 0, limit, unlimited, bonus: bonus ?? 0 };
  });

export const grantBonusSnap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabase, userId } = context;
    const { count } = await supabase.from("snap_bonuses").select("*", { count: "exact", head: true })
      .eq("user_id", userId).eq("earned_on", todayUtcDate());
    if ((count ?? 0) >= 5) throw new Error("Daily bonus limit reached.");
    const { error } = await supabase.from("snap_bonuses").insert({ user_id: userId, source: "ad" });
    if (error) throw new Error(error.message);
    return { ok: true, bonus: (count ?? 0) + 1 };
  });

export const analyzeSnap = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => SnapInput.parse(d))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    // Quota check
    const { data: roles } = await supabase.from("user_roles").select("role").eq("user_id", userId);
    const roleNames = (roles ?? []).map((r) => r.role);
    const unlimited = roleNames.includes("pro") || roleNames.includes("owner");
    if (!unlimited) {
      const { count } = await supabase.from("food_logs").select("*", { count: "exact", head: true })
        .eq("user_id", userId).gte("logged_at", startOfTodayIso());
      if ((count ?? 0) >= FREE_DAILY_LIMIT) {
        throw new Error("Daily snap limit reached. Upgrade to Pro for unlimited snaps.");
      }
    }

    // Normalize image
    let dataUrl = data.imageBase64;
    if (!dataUrl.startsWith("data:")) dataUrl = `data:${data.mime};base64,${dataUrl}`;
    const raw = dataUrl.split(",")[1];

    // Upload to storage
    const bytes = Uint8Array.from(atob(raw), (c) => c.charCodeAt(0));
    const filename = `${userId}/${Date.now()}.jpg`;
    const { error: upErr } = await supabase.storage.from("snaps").upload(filename, bytes, {
      contentType: data.mime, upsert: false,
    });
    if (upErr) console.error("upload err", upErr);

    // Call Lovable AI Gateway (Gemini vision) directly
    const key = process.env.LOVABLE_API_KEY;
    if (!key) throw new Error("LOVABLE_API_KEY missing");

    const prompt = `You are a nutrition AI. Analyze the food image and estimate the nutrition for one realistic serving as shown. Reply ONLY with a JSON object matching:
{
  "name": short dish name,
  "description": brief 1-line description of what is in the photo,
  "kcal": number,
  "protein_g": number,
  "carbs_g": number,
  "fat_g": number,
  "fiber_g": number,
  "sugar_g": number,
  "sodium_mg": number,
  "vit_a_mcg": number,
  "vit_c_mg": number,
  "vit_d_mcg": number,
  "vit_b12_mcg": number,
  "iron_mg": number,
  "calcium_mg": number
}
No markdown, no commentary, no code fences. If the image is not food, set name to "Not food" and all numbers to 0.`;

    const aiRes = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Lovable-API-Key": key,
        "X-Lovable-AIG-SDK": "vercel-ai-sdk",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              { type: "image_url", image_url: { url: dataUrl } },
            ],
          },
        ],
        response_format: { type: "json_object" },
      }),
    });

    if (!aiRes.ok) {
      const errText = await aiRes.text();
      if (aiRes.status === 429) throw new Error("AI is rate-limited. Try again in a moment.");
      if (aiRes.status === 402) throw new Error("AI credits exhausted. Add credits in workspace settings.");
      throw new Error(`AI gateway error ${aiRes.status}: ${errText.slice(0, 200)}`);
    }
    const aiJson = await aiRes.json() as { choices?: Array<{ message?: { content?: string } }> };
    const content = aiJson.choices?.[0]?.message?.content ?? "{}";
    let parsed: Record<string, unknown>;
    try {
      const cleaned = content.replace(/```json|```/g, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      throw new Error("AI returned invalid JSON");
    }

    const num = (k: string) => Number(parsed[k]) || 0;
    const row = {
      user_id: userId,
      image_url: filename,
      name: String(parsed.name ?? "Food"),
      description: String(parsed.description ?? ""),
      kcal: num("kcal"),
      protein_g: num("protein_g"),
      carbs_g: num("carbs_g"),
      fat_g: num("fat_g"),
      fiber_g: num("fiber_g"),
      sugar_g: num("sugar_g"),
      sodium_mg: num("sodium_mg"),
      vit_a_mcg: num("vit_a_mcg"),
      vit_c_mg: num("vit_c_mg"),
      vit_d_mcg: num("vit_d_mcg"),
      vit_b12_mcg: num("vit_b12_mcg"),
      iron_mg: num("iron_mg"),
      calcium_mg: num("calcium_mg"),
      ai_raw: parsed as never,
    };

    const { data: inserted, error: insErr } = await supabase.from("food_logs").insert(row).select().single();
    if (insErr) throw new Error(insErr.message);

    return { log: inserted };
  });

export const deleteFoodLog = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("food_logs").delete().eq("id", data.id).eq("user_id", context.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const getSignedSnapUrl = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) => z.object({ path: z.string() }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: signed } = await context.supabase.storage.from("snaps").createSignedUrl(data.path, 3600);
    return { url: signed?.signedUrl ?? null };
  });
