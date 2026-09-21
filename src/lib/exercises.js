import { supabase } from './supabase.js';

export const MUSCLE_GROUPS = [
  'Pecho',
  'Espalda',
  'Bíceps',
  'Tríceps',
  'Hombros',
  'Piernas',
  'Glúteos',
  'Abdominales',
  'Cardio',
  'Movilidad',
  'Crossfit',
];

export async function fetchExercises(gymId, { onlyActive = false } = {}) {
  let query = supabase.from('exercises').select('*').eq('gym_id', gymId).order('name');
  if (onlyActive) query = query.eq('active', true);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createExercise(payload) {
  const { error } = await supabase.from('exercises').insert(payload);
  if (error) throw error;
}

export async function updateExercise(id, payload) {
  const { error } = await supabase.from('exercises').update(payload).eq('id', id);
  if (error) throw error;
}

export async function deleteExercise(id) {
  const { error } = await supabase.from('exercises').delete().eq('id', id);
  if (error) throw error;
}

export async function uploadExerciseImage(gymId, file) {
  const ext = file.name.split('.').pop();
  const path = `${gymId}/exercises/${crypto.randomUUID()}.${ext}`;
  const { error } = await supabase.storage.from('gym-assets').upload(path, file, { contentType: file.type });
  if (error) throw error;
  const { data } = supabase.storage.from('gym-assets').getPublicUrl(path);
  return data.publicUrl;
}
