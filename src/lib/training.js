import { supabase } from './supabase.js';

export async function fetchMembers(gymId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name, email, member_number')
    .eq('gym_id', gymId)
    .eq('role', 'socio')
    .order('first_name');
  if (error) throw error;
  return data;
}

export async function fetchPlansForMember(gymId, memberId) {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchLatestPlanForMember(gymId, memberId) {
  const { data, error } = await supabase
    .from('training_plans')
    .select('*')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function createPlan(payload) {
  const { data, error } = await supabase.from('training_plans').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deletePlan(id) {
  const { error } = await supabase.from('training_plans').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRoutines(planId) {
  const { data, error } = await supabase
    .from('routines')
    .select('*')
    .eq('plan_id', planId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function createRoutine(payload) {
  const { data, error } = await supabase.from('routines').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function deleteRoutine(id) {
  const { error } = await supabase.from('routines').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchRoutineExercises(routineId) {
  const { data, error } = await supabase
    .from('routine_exercises')
    .select('*, exercises(id, name, muscle_group)')
    .eq('routine_id', routineId)
    .order('sort_order');
  if (error) throw error;
  return data;
}

export async function addRoutineExercise(payload) {
  const { error } = await supabase.from('routine_exercises').insert(payload);
  if (error) throw error;
}

export async function deleteRoutineExercise(id) {
  const { error } = await supabase.from('routine_exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function fetchWorkoutLogs(gymId, memberId) {
  const { data, error } = await supabase
    .from('workout_logs')
    .select('*, routines(name)')
    .eq('gym_id', gymId)
    .eq('member_id', memberId)
    .order('started_at', { ascending: false });
  if (error) throw error;
  return data;
}

export async function createWorkoutLog(payload) {
  const { data, error } = await supabase.from('workout_logs').insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function addWorkoutLogExercises(rows) {
  if (rows.length === 0) return;
  const { error } = await supabase.from('workout_log_exercises').insert(rows);
  if (error) throw error;
}
