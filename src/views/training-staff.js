import {
  fetchMembers,
  fetchPlansForMember,
  createPlan,
  deletePlan,
  fetchRoutines,
  createRoutine,
  deleteRoutine,
  fetchRoutineExercises,
  addRoutineExercise,
  deleteRoutineExercise,
} from '../lib/training.js';
import { fetchExercises } from '../lib/exercises.js';

export async function renderTrainingStaff(container, gym, profile) {
  container.innerHTML = `<p class="muted">Cargando…</p>`;

  const [members, exercises] = await Promise.all([fetchMembers(gym.id), fetchExercises(gym.id, { onlyActive: true })]);

  const state = { members, exercises, selectedMemberId: null, plans: [], selectedPlanId: null, routines: [] };

  container.innerHTML = `
    <div class="training-view">
      <h2>Planes y rutinas</h2>
      <input type="search" id="member-search" class="search-input" placeholder="Buscar socio por nombre…" />
      <label class="member-picker">
        Socio
        <select id="member-select">
          <option value="">Elegí un socio…</option>
          ${members.map((m) => `<option value="${m.id}">${escapeHtml(memberLabel(m))}</option>`).join('')}
        </select>
      </label>
      <div class="training-plans"></div>
      <div class="training-routines"></div>
    </div>
  `;

  const memberSelect = container.querySelector('#member-select');

  container.querySelector('#member-search').addEventListener('input', (event) => {
    const term = event.target.value.trim().toLowerCase();
    const filtered = term ? members.filter((m) => memberLabel(m).toLowerCase().includes(term)) : members;
    const keepSelected = filtered.some((m) => m.id === state.selectedMemberId);
    memberSelect.innerHTML = `
      <option value="">Elegí un socio…</option>
      ${filtered.map((m) => `<option value="${m.id}">${escapeHtml(memberLabel(m))}</option>`).join('')}
    `;
    memberSelect.value = keepSelected ? state.selectedMemberId : '';
  });

  memberSelect.addEventListener('change', async (event) => {
    state.selectedMemberId = event.target.value || null;
    state.selectedPlanId = null;
    if (state.selectedMemberId) {
      state.plans = await fetchPlansForMember(gym.id, state.selectedMemberId);
    } else {
      state.plans = [];
    }
    renderPlans();
    renderRoutinesSection();
  });

  const renderPlans = () => {
    const el = container.querySelector('.training-plans');
    if (!state.selectedMemberId) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div class="card">
        <h3>Planes</h3>
        ${
          state.plans.length
            ? `<ul class="plain-list">
                ${state.plans
                  .map(
                    (p) => `
                  <li class="plan-row ${state.selectedPlanId === p.id ? 'is-active' : ''}">
                    <button type="button" class="btn-link plan-select" data-id="${p.id}">${escapeHtml(p.name)}</button>
                    <span class="muted">${p.frequency ? `${p.frequency}x/sem` : ''}</span>
                    <button type="button" class="btn-link plan-delete" data-id="${p.id}">Eliminar</button>
                  </li>`
                  )
                  .join('')}
              </ul>`
            : `<p class="muted">Este socio todavía no tiene planes.</p>`
        }
        <form id="plan-form" class="form">
          <label>
            Nombre del plan
            <input type="text" name="name" required placeholder="Plan Octubre 2026" />
          </label>
          <div class="form-row">
            <label>
              Desde
              <input type="date" name="start_date" />
            </label>
            <label>
              Hasta
              <input type="date" name="end_date" />
            </label>
          </div>
          <label>
            Frecuencia semanal
            <select name="frequency">
              <option value="">Sin especificar</option>
              <option value="2">2 entrenamientos</option>
              <option value="3">3 entrenamientos</option>
              <option value="4">4 entrenamientos</option>
              <option value="5">5 entrenamientos</option>
            </select>
          </label>
          <button type="submit" class="btn btn-primary">Crear plan</button>
        </form>
      </div>
    `;

    el.querySelectorAll('.plan-select').forEach((btn) => {
      btn.addEventListener('click', async () => {
        state.selectedPlanId = btn.dataset.id;
        state.routines = await fetchRoutines(state.selectedPlanId);
        renderPlans();
        renderRoutinesSection();
      });
    });
    el.querySelectorAll('.plan-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este plan y todas sus rutinas?')) return;
        await deletePlan(btn.dataset.id);
        if (state.selectedPlanId === btn.dataset.id) state.selectedPlanId = null;
        state.plans = await fetchPlansForMember(gym.id, state.selectedMemberId);
        renderPlans();
        renderRoutinesSection();
      });
    });

    el.querySelector('#plan-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      const plan = await createPlan({
        gym_id: gym.id,
        member_id: state.selectedMemberId,
        professor_id: profile.role === 'profe' ? profile.id : null,
        name: formData.get('name'),
        start_date: formData.get('start_date') || null,
        end_date: formData.get('end_date') || null,
        frequency: formData.get('frequency') || null,
      });
      state.plans = await fetchPlansForMember(gym.id, state.selectedMemberId);
      state.selectedPlanId = plan.id;
      state.routines = await fetchRoutines(plan.id);
      renderPlans();
      renderRoutinesSection();
    });
  };

  const renderRoutinesSection = () => {
    const el = container.querySelector('.training-routines');
    if (!state.selectedPlanId) {
      el.innerHTML = '';
      return;
    }

    el.innerHTML = `
      <div class="card">
        <h3>Rutinas</h3>
        <div class="routines-list"></div>
        <form id="routine-form" class="form">
          <label>
            Nombre de la rutina
            <input type="text" name="name" required placeholder="Rutina A - Pecho + Tríceps" />
          </label>
          <button type="submit" class="btn btn-primary">Agregar rutina</button>
        </form>
      </div>
    `;

    renderRoutinesList();

    el.querySelector('#routine-form').addEventListener('submit', async (event) => {
      event.preventDefault();
      const formData = new FormData(event.target);
      await createRoutine({
        gym_id: gym.id,
        plan_id: state.selectedPlanId,
        name: formData.get('name'),
        sort_order: state.routines.length,
      });
      event.target.reset();
      state.routines = await fetchRoutines(state.selectedPlanId);
      renderRoutinesList();
    });
  };

  const renderRoutinesList = async () => {
    const listEl = container.querySelector('.routines-list');
    if (!listEl) return;
    if (state.routines.length === 0) {
      listEl.innerHTML = `<p class="muted">Sin rutinas todavía.</p>`;
      return;
    }

    const routineExercisesEntries = await Promise.all(
      state.routines.map(async (r) => [r.id, await fetchRoutineExercises(r.id)])
    );
    const routineExercisesMap = Object.fromEntries(routineExercisesEntries);

    listEl.innerHTML = state.routines.map((r) => routineCardMarkup(r, routineExercisesMap[r.id], state.exercises)).join('');

    listEl.querySelectorAll('.routine-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar esta rutina y sus ejercicios?')) return;
        await deleteRoutine(btn.dataset.id);
        state.routines = await fetchRoutines(state.selectedPlanId);
        renderRoutinesList();
      });
    });

    listEl.querySelectorAll('.routine-exercise-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await deleteRoutineExercise(btn.dataset.id);
        renderRoutinesList();
      });
    });

    listEl.querySelectorAll('.routine-exercise-form').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const formData = new FormData(form);
        const routineId = form.dataset.routineId;
        const currentCount = routineExercisesMap[routineId]?.length ?? 0;
        await addRoutineExercise({
          gym_id: gym.id,
          routine_id: routineId,
          exercise_id: formData.get('exercise_id'),
          sort_order: currentCount,
          series: formData.get('series') || null,
          reps: formData.get('reps') || null,
          weight_suggested: formData.get('weight_suggested') || null,
          rest_seconds: formData.get('rest_seconds') || null,
          notes: formData.get('notes') || null,
        });
        renderRoutinesList();
      });
    });
  };

  renderPlans();
}

function routineCardMarkup(routine, routineExercises, exercises) {
  const exerciseOptions = exercises.map((e) => `<option value="${e.id}">${escapeHtml(e.name)}</option>`).join('');
  const rows = (routineExercises ?? [])
    .map(
      (re) => `
      <tr>
        <td>${escapeHtml(re.exercises?.name ?? '')}</td>
        <td>${re.series ?? '—'}</td>
        <td>${re.reps ?? '—'}</td>
        <td>${re.weight_suggested ?? '—'}</td>
        <td>${re.rest_seconds ?? '—'}</td>
        <td>${re.notes ? escapeHtml(re.notes) : ''}</td>
        <td><button type="button" class="btn-link routine-exercise-delete" data-id="${re.id}">Eliminar</button></td>
      </tr>`
    )
    .join('');

  return `
    <div class="routine-card">
      <div class="routine-card-header">
        <strong>${escapeHtml(routine.name)}</strong>
        <button type="button" class="btn-link routine-delete" data-id="${routine.id}">Eliminar rutina</button>
      </div>
      ${
        rows
          ? `<table class="routine-exercise-table">
              <thead><tr><th>Ejercicio</th><th>Series</th><th>Reps</th><th>Peso</th><th>Descanso</th><th>Nota</th><th></th></tr></thead>
              <tbody>${rows}</tbody>
            </table>`
          : `<p class="muted">Sin ejercicios todavía.</p>`
      }
      <form class="routine-exercise-form form-row-wrap" data-routine-id="${routine.id}">
        <select name="exercise_id" required>${exerciseOptions}</select>
        <input type="number" name="series" placeholder="Series" min="1" />
        <input type="number" name="reps" placeholder="Reps" min="1" />
        <input type="number" name="weight_suggested" placeholder="Peso (kg)" step="0.5" min="0" />
        <input type="number" name="rest_seconds" placeholder="Descanso (s)" min="0" />
        <input type="text" name="notes" placeholder="Nota" />
        <button type="submit" class="btn-link">+ Agregar ejercicio</button>
      </form>
    </div>
  `;
}

function memberLabel(m) {
  const name = [m.first_name, m.last_name].filter(Boolean).join(' ');
  return name || m.email;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
