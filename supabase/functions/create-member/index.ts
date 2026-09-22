import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { email, password, first_name, last_name, phone } = await req.json();
    if (!email || !password) throw new Error("email y password son requeridos");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No autorizado");

    const anonClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );

    const {
      data: { user },
      error: userErr,
    } = await anonClient.auth.getUser();
    if (userErr || !user) throw new Error("No autorizado");

    const { data: callerProfile, error: callerErr } = await anonClient
      .from("profiles")
      .select("role, gym_id")
      .eq("id", user.id)
      .single();
    if (callerErr || !callerProfile || callerProfile.role !== "admin") {
      throw new Error("Solo un admin puede dar de alta socios");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: created, error: createErr } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        gym_id: callerProfile.gym_id,
        first_name: first_name ?? null,
        last_name: last_name ?? null,
      },
    });
    if (createErr) throw createErr;

    const { error: updateErr } = await adminClient
      .from("profiles")
      .update({ status: "active", phone: phone ?? null })
      .eq("id", created.user.id);
    if (updateErr) throw updateErr;

    return new Response(JSON.stringify({ id: created.user.id }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
