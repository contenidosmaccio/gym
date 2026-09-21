import {
  fetchLatestPlanForMember,
  fetchRoutines,
  fetchRoutineExercises,
  fetchWorkoutLogs,
  createWorkoutLog,
  addWorkoutLogExercises,
} from '../lib/training.js';

export async function renderTrainingMember(container, gym, profile) {
  container.innerHTML = `<p class="muted">Cargando…</p>`;

  const state = { subTab: 'plan', plan: null, routines: [], activeRoutineId: null, logs: [] };
  state.plan = await fetchLatestPlanForMember(gym.id, profile.id);
  if (state.plan) state.routines = await fetchRoutines(state.plan.id);

  container.innerHTML = `
    <div class="training-view">
      <h2>Mi entrenamiento</h2>
      <nav class="app-tabs sub-tabs">
        <button type="button" class="app-tab sub-tab" data-sub="plan">Mi plan</button>
        <button type="button" class="app-tab sub-tab" data-sub="history">Historial</button>
      </nav>
      <div class="training-sub-content"></div>
    </div>
  `;

  const subTabButtons = [...container.querySelectorAll('.sub-tab')];
  const subContent = container.querySelector('.training-sub-content');

  async function selectSubTab(tab) {
    state.subTab = tab;
    subTabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.sub === tab));
    if (tab === 'history') {
      state.logs = await fetchWorkoutLogs(gym.id, profile.id);
      renderHistory();
    } else {
      renderPlan();
    }
  }

  subTabButtons.forEach((btn) => btn.addEventListener('click', () => selectSubTab(btn.dataset.sub)));

  function renderPlan() {
    if (!state.plan) {
      subContent.innerHTML = `<div class="card"><p>Todavía no tenés un plan de entrenamiento asignado. Hablá con tu profe o el gimnasio.</p></div>`;
      return;
    }

    subContent.innerHTML = `
      <div class="card">
        <h3>${escapeHtml(state.plan.name)}</h3>
        ${state.plan.frequency ? `<p class="muted">${state.plan.frequency} entrenamientos por semana</p>` : ''}
        <ul class="plain-list">
          ${state.routines
            .map(
              (r) => `<li>
                <button type="button" class="btn-link routine-open" data-id="${r.id}">${escapeHtml(r.name)}</button>
              </li>`
            )
            .join('') || `<p class="muted">Sin rutinas cargadas todavía.</p>`}
        </ul>
      </div>
      <div class="routine-execution"></div>
    `;

    subContent.querySelectorAll('.routine-open').forEach((btn) => {
      btn.addEventListener('click', async () => {
        state.activeRoutineId = btn.dataset.id;
        const routine = state.routines.find((r) => r.id === state.activeRoutineId);
        const routineExercises = await fetchRoutineExercises(state.activeRoutineId);
        renderExecution(routine, routineExercises);
      });
    });
  }

  function renderExecution(routine, routineExercises) {
    const execEl = subContent.querySelector('.routine-execution');
    if (routineExercises.length === 0) {
      execEl.innerHTML = `<div class="card"><p class="muted">Esta rutina todavía no tiene ejercicios cargados.</p></div>`;
      return;
    }

    execEl.innerHTML = `
      <div class="card">
        <h3>${escapeHtml(routine.name)}</h3>
        <form id="execution-form" class="form">
          ${routineExercises
            .map(
              (re, i) => `
            <div class="exercise-log-row">
              <strong>${i + 1}. ${escapeHtml(re.exercises?.name ?? '')}</strong>
              <p class="muted">
                ${re.series ? `${re.series} series` : ''}${re.reps ? ` × ${re.reps} reps` : ''}
                ${re.weight_suggested ? ` · Sugerido: ${re.weight_suggested} kg` : ''}
                ${re.rest_seconds ? ` · Descanso: ${re.rest_seconds}s` : ''}
              </p>
              ${re.notes ? `<p class="muted">Nota del profe: ${escapeHtml(re.notes)}</p>` : ''}
              <div class="form-row">
                <label>
                  Series completadas
                  <input type="number" name="sets_${re.id}" min="0" />
                </label>
                <label>
                  Peso utilizado (kg)
                  <input type="number" name="weight_${re.id}" step="0.5" min="0" value="${re.weight_suggested ?? ''}" />
                </label>
                <label>
                  Reps reales
                  <input type="number" name="reps_${re.id}" min="0" value="${re.reps ?? ''}" />
                </label>
              </div>
              <label>
                Nota
                <input type="text" name="notes_${re.id}" placeholder="¿Cómo te sentiste?" />
              </label>
            </div>
          `
            )
            .join('')}
          <label>
            Duración total (minutos)
            <input type="number" name="duration_minutes" min="1" />
          </label>
          <p class="form-success" id="execution-success" hidden>Entrenamiento completado. ¡Buen trabajo! 🔥</p>
          <button type="submit" class="btn btn-primary">Finalizar entrenamiento</button>
        </form>
      </div>
    `;

    execEl.querySelector('#execution-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const submitBtn = event.target.querySelector('button[type="submit"]');
      submitBtn.disabled = true;

      const log = await createWorkoutLog({
        gym_id: gym.id,
        member_id: profile.id,
        routine_id: routine.id,
        completed_at: new Date().toISOString(),
        duration_minutes: formData.get('duration_minutes') || null,
      });

      const rows = routineExercises.map((re) => ({
        gym_id: gym.id,
        workout_log_id: log.id,
        routine_exercise_id: re.id,
        sets_completed: formData.get(`sets_${re.id}`) || null,
        weight_used: formData.get(`weight_${re.id}`) || null,
        reps_actual: formData.get(`reps_${re.id}`) || null,
        notes: formData.get(`notes_${re.id}`) || null,
      }));
      await addWorkoutLogExercises(rows);

      document.querySelector('#execution-success').hidden = false;
      submitBtn.disabled = true;
    });
  }

  function renderHistory() {
    if (state.logs.length === 0) {
      subContent.innerHTML = `<div class="card"><p class="muted">Todavía no completaste ningún entrenamiento.</p></div>`;
      return;
    }
    subContent.innerHTML = `
      <ul class="plain-list history-list">
        ${state.logs
          .map(
            (log) => `
          <li class="history-row">
            <span>${formatDate(log.completed_at ?? log.started_at)}</span>
            <span>${escapeHtml(log.routines?.name ?? 'Entrenamiento')}</span>
            <span class="muted">${log.duration_minutes ? `${log.duration_minutes} min` : ''}</span>
          </li>`
          )
          .join('')}
      </ul>
    `;
  }

  selectSubTab('plan');
}

function formatDate(value) {
  if (!value) return '';
  const d = new Date(value);
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
