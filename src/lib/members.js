import { supabase } from './supabase.js';

export async function fetchAllMembers(gymId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('gym_id', gymId)
    .eq('role', 'socio')
    .order('first_name');
  if (error) throw error;
  return data;
}

export async function updateMemberProfile(id, payload) {
  const { error } = await supabase.from('profiles').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteMemberAccount(memberId) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('delete-member', {
    body: { member_id: memberId },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function fetchLatestMembership(gymId, memberId) {
  const { data, error } = await supabase
    .from('memberships')
    .select('*, membership_plans(id, name, price, sessions_per_week)')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchLatestMembershipsForGym(gymId) {
  const { data, error } = await supabase
    .from('memberships')
    .select('member_id, paid_at, expires_at, membership_plans(name)')
    .eq('gym_id', gymId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const latestByMember = new Map();
  for (const row of data) {
    if (!latestByMember.has(row.member_id)) latestByMember.set(row.member_id, row);
  }
  return latestByMember;
}

export async function createMembership(payload) {
  const { error } = await supabase.from('memberships').insert(payload);
  if (error) throw error;
}

export async function createMemberAccount({ email, password, firstName, lastName, phone }) {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const { data, error } = await supabase.functions.invoke('create-member', {
    body: { email, password, first_name: firstName, last_name: lastName, phone },
    headers: { Authorization: `Bearer ${session.access_token}` },
  });
  if (error) throw error;
  if (data?.error) throw new Error(data.error);
  return data;
}

export async function uploadMemberPhoto(gymId, memberId, blob) {
  const path = `${gymId}/members/${memberId}.jpg`;
  const { error } = await supabase.storage
    .from('gym-assets')
    .upload(path, blob, { contentType: 'image/jpeg', upsert: true });
  if (error) throw error;
  const { data } = supabase.storage.from('gym-assets').getPublicUrl(path);
  return `${data.publicUrl}?t=${Date.now()}`;
}
