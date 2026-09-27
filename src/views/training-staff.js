import {
  fetchMembers,
  fetchPlansForGym,
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
import { localToday } from '../lib/dashboard-metrics.js';
import { modalShellMarkup, initModal } from '../lib/modal.js';

const ICONS = {
  eye: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  plus: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14M5 12h14"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.78-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.19.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.34z"/><path d="M12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.48 1.35 5L2 22l5.13-1.34A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18.19a8.19 8.19 0 0 1-4.18-1.15l-.3-.18-3.05.8.81-2.97-.2-.3A8.19 8.19 0 0 1 3.78 12c0-4.53 3.69-8.21 8.22-8.21 2.2 0 4.26.85 5.81 2.4a8.16 8.16 0 0 1 2.4 5.81c0 4.53-3.68 8.19-8.21 8.19z"/></svg>`,
};

export async function renderTrainingStaff(container, gym, profile) {
  container.innerHTML = `<p class="muted">Cargando…</p>`;

  const [members, allPlans, exercises] = await Promise.all([
    fetchMembers(gym.id),
    fetchPlansForGym(gym.id),
    fetchExercises(gym.id, { onlyActive: true }),
  ]);

  const { first, last } = monthRangeIso(localToday());

  const state = {
    members,
    allPlans,
    exercises,
    search: '',
    dateFrom: first,
    dateTo: last,
    selectedMemberId: null,
    plans: [],
    selectedPlanId: null,
    routines: [],
  };

  container.innerHTML = `
    <div class="training-view">
      <h2>Planes y rutinas</h2>
      <div class="training-toolbar">
        <input type="search" id="member-search" class="search-input" placeholder="Buscar socio por nombre…" />
        <label class="date-filter">Desde <input type="date" id="filter-from" value="${state.dateFrom}" /></label>
        <label class="date-filter">Hasta <input type="date" id="filter-to" value="${state.dateTo}" /></label>
      </div>
      <div class="members-table-wrap"><div class="training-members-list"></div></div>
    </div>
    ${modalShellMarkup()}
  `;

  const modal = initModal(container);
  container.querySelector('.modal').classList.add('modal-wide');

  const openMemberModal = async (memberId) => {
    state.selectedMemberId = memberId;
    state.selectedPlanId = null;
    state.plans = await fetchPlansForMember(gym.id, memberId);
    state.routines = [];
    modal.open(`<div class="training-plans"></div><div class="training-routines"></div>`, () => {
      renderPlans();
      renderRoutinesSection();
    });
  };

  const focusInput = (selector) => {
    const input = container.querySelector(selector);
    if (input) {
      input.scrollIntoView({ behavior: 'smooth', block: 'center' });
      input.focus();
    }
  };

  const renderMembersList = () => {
    const listEl = container.querySelector('.training-members-list');
    const term = state.search.toLowerCase();
    const visible = term ? state.members.filter((m) => memberLabel(m).toLowerCase().includes(term)) : state.members;

    if (visible.length === 0) {
      listEl.innerHTML = `<p class="muted">No hay socios para mostrar.</p>`;
      return;
    }

    listEl.innerHTML = `
      <table class="training-members-table">
        <thead>
          <tr>
            <th>N°</th>
            <th>Imagen</th>
            <th>Nombre</th>
            <th>Plan</th>
            <th>Whatsapp</th>
            <th></th>
          </tr>
        </thead>
        <tbody>
          ${visible.map((m) => memberRowMarkup(m, plansInRangeForMember(state, m.id))).join('')}
        </tbody>
      </table>
    `;

    listEl.querySelectorAll('.routine-view').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await openMemberModal(btn.dataset.id);
        const matching = plansInRangeForMember(state, btn.dataset.id);
        if (matching.length) {
          state.selectedPlanId = matching[0].id;
          state.routines = await fetchRoutines(state.selectedPlanId);
          renderPlans();
          renderRoutinesSection();
        }
      });
    });
    listEl.querySelectorAll('.routine-add').forEach((btn) => {
      btn.addEventListener('click', async () => {
        await openMemberModal(btn.dataset.id);
        const matching = plansInRangeForMember(state, btn.dataset.id);
        if (matching.length) {
          state.selectedPlanId = matching[0].id;
          state.routines = await fetchRoutines(state.selectedPlanId);
          renderPlans();
          renderRoutinesSection();
          focusInput('#routine-form [name="name"]');
        } else {
          focusInput('#plan-form [name="name"]');
        }
      });
    });
  };

  container.querySelector('#member-search').addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    renderMembersList();
  });
  container.querySelector('#filter-from').addEventListener('change', (event) => {
    state.dateFrom = event.target.value || null;
    renderMembersList();
  });
  container.querySelector('#filter-to').addEventListener('change', (event) => {
    state.dateTo = event.target.value || null;
    renderMembersList();
  });

  const renderPlans = () => {
    const el = container.querySelector('.training-plans');
    if (!el) return;
    if (!state.selectedMemberId) {
      el.innerHTML = '';
      return;
    }
    const selectedMember = members.find((m) => m.id === state.selectedMemberId);

    el.innerHTML = `
      <div class="card">
        <h3>Planes${selectedMember ? ` de ${escapeHtml(memberLabel(selectedMember))}` : ''}</h3>
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
        state.allPlans = await fetchPlansForGym(gym.id);
        renderPlans();
        renderRoutinesSection();
        renderMembersList();
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
      state.allPlans = await fetchPlansForGym(gym.id);
      state.selectedPlanId = plan.id;
      state.routines = await fetchRoutines(plan.id);
      renderPlans();
      renderRoutinesSection();
      renderMembersList();
    });
  };

  const renderRoutinesSection = () => {
    const el = container.querySelector('.training-routines');
    if (!el) return;
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

  renderMembersList();
}

function memberRowMarkup(m, matchingPlans) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email;
  const planLabel = matchingPlans.length ? matchingPlans.map((p) => escapeHtml(p.name)).join(', ') : 'Sin plan';
  const phoneDigits = (m.phone ?? '').replace(/\D/g, '');

  return `
    <tr>
      <td>${escapeHtml(m.member_number ?? '—')}</td>
      <td>${m.photo_url ? `<img class="member-thumb" src="${escapeHtml(m.photo_url)}" alt="" />` : `<span class="member-thumb member-thumb-placeholder"></span>`}</td>
      <td>${escapeHtml(fullName)}</td>
      <td>${planLabel}</td>
      <td>
        ${
          phoneDigits
            ? `<a class="icon-btn whatsapp-link" href="https://wa.me/${phoneDigits}" target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp">${ICONS.whatsapp}</a>`
            : `<span class="icon-btn is-disabled" title="Sin teléfono registrado">${ICONS.whatsapp}</span>`
        }
      </td>
      <td class="row-actions">
        <button type="button" class="icon-btn routine-view" data-id="${m.id}" title="Consultar rutina">${ICONS.eye}</button>
        <button type="button" class="icon-btn routine-add" data-id="${m.id}" title="Cargar nueva rutina">${ICONS.plus}</button>
      </td>
    </tr>
  `;
}

function plansInRangeForMember(state, memberId) {
  return state.allPlans
    .filter((p) => p.member_id === memberId)
    .filter((p) => planMatchesRange(p, state.dateFrom, state.dateTo));
}

function planMatchesRange(plan, from, to) {
  if (from && plan.end_date && plan.end_date < from) return false;
  if (to && plan.start_date && plan.start_date > to) return false;
  return true;
}

function monthRangeIso(iso) {
  const [y, m] = iso.split('-').map(Number);
  const first = `${y}-${String(m).padStart(2, '0')}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const last = `${y}-${String(m).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  return { first, last };
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
