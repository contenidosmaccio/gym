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

export async function createActivity(gymId, { name, color }) {
  const { data, error } = await supabase
    .from('activities')
    .insert({ gym_id: gymId, name, color: color || '#888888' })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteActivity(id) {
  const { error } = await supabase.from('activities').delete().eq('id', id);
  if (error) throw error;
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

export async function deleteSchedule(id) {
  const { error } = await supabase.from('class_schedules').delete().eq('id', id);
  if (error) throw error;
}

export async function setScheduleCell(gymId, dayOfWeek, hour, activityId, existingId) {
  if (existingId) await deleteSchedule(existingId);
  if (!activityId) return null;

  const start_time = `${String(hour).padStart(2, '0')}:00:00`;
  const end_time = hour === 23 ? '23:59:59' : `${String(hour + 1).padStart(2, '0')}:00:00`;

  const { data, error } = await supabase
    .from('class_schedules')
    .insert({ gym_id: gymId, activity_id: activityId, day_of_week: dayOfWeek, start_time, end_time })
    .select('*, activities(id, name, color)')
    .single();
  if (error) throw error;
  return data;
}
