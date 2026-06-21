// One-time bootstrap endpoint to create the two owner accounts.
// Idempotent — safe to call multiple times. Skips if user already exists.
import { createFileRoute } from "@tanstack/react-router";

const OWNERS = [
  { email: "luqmaan1007@hotmail.com", password: "luqmaan@123" },
  { email: "fardowsah994@gmail.com", password: "Ganacsi@2026" },
];

export const Route = createFileRoute("/api/public/bootstrap-owners")({
  server: {
    handlers: {
      GET: async () => {
        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
        const results: Array<{ email: string; status: string; id?: string }> = [];
        for (const o of OWNERS) {
          // Check if user exists
          const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
          const existing = list?.users.find((u) => u.email?.toLowerCase() === o.email.toLowerCase());
          if (existing) {
            // Ensure owner role
            await supabaseAdmin.from("user_roles").upsert(
              { user_id: existing.id, role: "owner" },
              { onConflict: "user_id,role", ignoreDuplicates: true }
            );
            results.push({ email: o.email, status: "exists", id: existing.id });
            continue;
          }
          const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
            email: o.email, password: o.password, email_confirm: true,
            user_metadata: { full_name: o.email.split("@")[0] },
          });
          if (error) {
            results.push({ email: o.email, status: `error: ${error.message}` });
            continue;
          }
          if (created.user) {
            await supabaseAdmin.from("user_roles").upsert(
              { user_id: created.user.id, role: "owner" },
              { onConflict: "user_id,role", ignoreDuplicates: true }
            );
            results.push({ email: o.email, status: "created", id: created.user.id });
          }
        }
        return Response.json({ ok: true, results });
      },
    },
  },
});
