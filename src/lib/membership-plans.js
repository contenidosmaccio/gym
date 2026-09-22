import { supabase } from './supabase.js';

export async function fetchMembershipPlans(gymId, { onlyActive = false } = {}) {
  let query = supabase.from('membership_plans').select('*').eq('gym_id', gymId).order('sessions_per_week');
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createMembershipPlan(payload) {
  const { error } = await supabase.from('membership_plans').insert(payload);
  if (error) throw error;
}

export async function updateMembershipPlan(id, payload) {
  const { error } = await supabase.from('membership_plans').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteMembershipPlan(id) {
  const { error } = await supabase.from('membership_plans').delete().eq('id', id);
  if (error) throw error;
}
