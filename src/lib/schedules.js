import { supabase } from './supabase.js';

export const DAY_LABELS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DAY_LABELS_SHORT = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'];

export async function fetchActivities(gymId) {
  const { data, error } = await supabase
    .from('activities')
    .select('*')
    .eq('gym_id', gymId)
    .eq('active', true)
    .order('name');
  if (error) throw error;
  return data;
}

export async function fetchSchedules(gymId) {
  const { data, error } = await supabase
    .from('class_schedules')
    .select('*, activities(id, name, color)')
    .eq('gym_id', gymId)
    .order('day_of_week')
    .order('start_time');
  if (error) throw error;
  return data;
}

export async function fetchProfessors(gymId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, first_name, last_name')
    .eq('gym_id', gymId)
    .eq('role', 'profe')
    .order('first_name');
  if (error) throw error;
  return data;
}

export async function createSchedules(rows) {
  const { error } = await supabase.from('class_schedules').insert(rows);
  if (error) throw error;
}

export async function deleteSchedule(id) {
  const { error } = await supabase.from('class_schedules').delete().eq('id', id);
  if (error) throw error;
}
