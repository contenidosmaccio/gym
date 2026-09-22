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
    const { member_id } = await req.json();
    if (!member_id) throw new Error("member_id requerido");

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
      throw new Error("Solo un admin puede eliminar socios");
    }

    const adminClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: targetProfile, error: targetErr } = await adminClient
      .from("profiles")
      .select("gym_id")
      .eq("id", member_id)
      .single();
    if (targetErr || !targetProfile) throw new Error("Socio no encontrado");
    if (targetProfile.gym_id !== callerProfile.gym_id) {
      throw new Error("No tenés permiso sobre este socio");
    }

    const { error: deleteErr } = await adminClient.auth.admin.deleteUser(member_id);
    if (deleteErr) throw deleteErr;

    return new Response(JSON.stringify({ success: true }), {
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
