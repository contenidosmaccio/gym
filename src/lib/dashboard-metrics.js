import { supabase } from './supabase.js';

export function localToday() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

export function addDaysIso(iso, days) {
  const d = new Date(`${iso}T00:00:00`);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

export async function fetchAdminMetrics(gymId) {
  const today = localToday();
  const weekAhead = addDaysIso(today, 7);
  const monthAgo = addDaysIso(today, -30);

  const [membersRes, profesRes, membershipsRes] = await Promise.all([
    supabase.from('profiles').select('id, status').eq('gym_id', gymId).eq('role', 'socio'),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true })
      .eq('gym_id', gymId)
      .eq('role', 'profe')
      .eq('status', 'active'),
    supabase
      .from('memberships')
      .select('member_id, expires_at, membership_plans(name)')
      .eq('gym_id', gymId)
      .order('created_at', { ascending: false }),
  ]);

  if (membersRes.error) throw membersRes.error;
  if (profesRes.error) throw profesRes.error;
  if (membershipsRes.error) throw membershipsRes.error;

  const members = membersRes.data;
  const latestByMember = new Map();
  for (const row of membershipsRes.data) {
    if (!latestByMember.has(row.member_id)) latestByMember.set(row.member_id, row);
  }

  let alDia = 0;
  let vencidos = 0;
  let vencenEstaSemana = 0;
  let vencieronUltimoMes = 0;
  let sinPlan = 0;
  const planCounts = new Map();

  for (const m of members) {
    const membership = latestByMember.get(m.id);
    if (!membership || !membership.expires_at) {
      sinPlan += 1;
      planCounts.set('Sin plan', (planCounts.get('Sin plan') ?? 0) + 1);
      continue;
    }

    const planName = membership.membership_plans?.name ?? 'Sin plan';
    planCounts.set(planName, (planCounts.get(planName) ?? 0) + 1);

    if (membership.expires_at >= today) {
      alDia += 1;
      if (membership.expires_at <= weekAhead) vencenEstaSemana += 1;
    } else {
      vencidos += 1;
      if (membership.expires_at >= monthAgo) vencieronUltimoMes += 1;
    }
  }

  return {
    totalSocios: members.length,
    activeMembers: members.filter((m) => m.status === 'active').length,
    profesores: profesRes.count ?? 0,
    alDia,
    vencidos,
    vencenEstaSemana,
    vencieronUltimoMes,
    sinPlan,
    planDistribution: [...planCounts.entries()]
      .map(([label, count]) => ({ label, count }))
      .sort((a, b) => (a.label === 'Sin plan' ? 1 : b.label === 'Sin plan' ? -1 : b.count - a.count)),
  };
}
