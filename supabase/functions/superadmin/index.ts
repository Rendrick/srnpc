import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY env vars");
}

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
};

function getBearerToken(req: Request): string | null {
  const raw = (req.headers.get("Authorization") ?? "").trim();
  if (!raw.toLowerCase().startsWith("bearer ")) return null;
  return raw.slice(7).trim();
}

async function assertSuperadmin(accessToken: string) {
  const { data: userData, error: userErr } = await supabaseAdmin.auth.getUser(accessToken);
  if (userErr) throw new Error(`Auth user check failed: ${userErr.message}`);
  const user = userData?.user;
  if (!user?.id) throw new Error("Usuário não autenticado.");

  const { data: sa, error: saErr } = await supabaseAdmin
    .from("superadmins")
    .select("user_id")
    .eq("user_id", user.id)
    .maybeSingle();

  if (saErr) throw new Error(`Superadmin check failed: ${saErr.message}`);
  if (!sa) throw new Error("Acesso negado.");

  return user;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { status: 200, headers: corsHeaders });
  }

  try {
    const token = getBearerToken(req);
    if (!token) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Garante que o chamador é superadmin.
    await assertSuperadmin(token);

    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const payload = await req.json().catch(() => ({} as Record<string, unknown>));
    const action = String(payload.action ?? "");

    switch (action) {
      case "list_clinics": {
        const { data, error } = await supabaseAdmin
          .from("clinics")
          .select("id, name, created_at")
          .order("created_at", { ascending: false });
        if (error) throw new Error(error.message);
        return new Response(JSON.stringify({ clinics: data ?? [] }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "create_clinic": {
        const name = String(payload.name ?? "").trim();
        if (!name)
          return new Response(JSON.stringify({ error: "name é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { data, error } = await supabaseAdmin
          .from("clinics")
          .insert({ name })
          .select("id, name, created_at")
          .single();
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ clinic: data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "update_clinic": {
        const clinicId = String(payload.clinicId ?? "").trim();
        const name = String(payload.name ?? "").trim();
        if (!clinicId)
          return new Response(JSON.stringify({ error: "clinicId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        if (!name)
          return new Response(JSON.stringify({ error: "name é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { data, error } = await supabaseAdmin
          .from("clinics")
          .update({ name })
          .eq("id", clinicId)
          .select("id, name, created_at")
          .maybeSingle();
        if (error) throw new Error(error.message);
        return new Response(JSON.stringify({ clinic: data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "delete_clinic": {
        const clinicId = String(payload.clinicId ?? "").trim();
        if (!clinicId)
          return new Response(JSON.stringify({ error: "clinicId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { error } = await supabaseAdmin.from("clinics").delete().eq("id", clinicId);
        if (error) throw new Error(error.message);
        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "list_clinic_members": {
        const clinicId = String(payload.clinicId ?? "").trim();
        if (!clinicId)
          return new Response(JSON.stringify({ error: "clinicId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { data, error } = await supabaseAdmin
          .from("clinic_members")
          .select("clinic_id, user_id, role, created_at")
          .eq("clinic_id", clinicId);
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ members: data ?? [] }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "add_clinic_member": {
        const clinicId = String(payload.clinicId ?? "").trim();
        const userId = String(payload.userId ?? "").trim();
        const role = String(payload.role ?? "member").trim() || "member";
        if (!clinicId)
          return new Response(JSON.stringify({ error: "clinicId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        if (!userId)
          return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { data, error } = await supabaseAdmin
          .from("clinic_members")
          .insert({ clinic_id: clinicId, user_id: userId, role })
          .select("clinic_id, user_id, role, created_at")
          .maybeSingle();
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ member: data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "remove_clinic_member": {
        const clinicId = String(payload.clinicId ?? "").trim();
        const userId = String(payload.userId ?? "").trim();
        if (!clinicId)
          return new Response(JSON.stringify({ error: "clinicId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        if (!userId)
          return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { error } = await supabaseAdmin
          .from("clinic_members")
          .delete()
          .eq("clinic_id", clinicId)
          .eq("user_id", userId);
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "set_superadmin": {
        const userId = String(payload.userId ?? "").trim();
        const isSuper = Boolean(payload.isSuper);
        if (!userId)
          return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        if (isSuper) {
          const { error } = await supabaseAdmin
            .from("superadmins")
            .upsert({ user_id: userId }, { onConflict: "user_id" });
          if (error) throw new Error(error.message);
        } else {
          const { error } = await supabaseAdmin.from("superadmins").delete().eq("user_id", userId);
          if (error) throw new Error(error.message);
        }

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "create_user": {
        const email = String(payload.email ?? "").trim();
        const password = String(payload.password ?? "").trim();
        if (!email)
          return new Response(JSON.stringify({ error: "email é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });
        if (!password)
          return new Response(JSON.stringify({ error: "password é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { data, error } = await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ user: data }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      case "delete_user": {
        const userId = String(payload.userId ?? "").trim();
        if (!userId)
          return new Response(JSON.stringify({ error: "userId é obrigatório" }), {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          });

        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId);
        if (error) throw new Error(error.message);

        return new Response(JSON.stringify({ ok: true }), {
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Ação inválida: ${action}` }), {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});

