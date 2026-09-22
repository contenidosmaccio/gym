import {
  MUSCLE_GROUPS,
  fetchExercises,
  createExercise,
  updateExercise,
  deleteExercise,
  uploadExerciseImage,
} from '../lib/exercises.js';
import { modalShellMarkup, initModal } from '../lib/modal.js';

export async function renderExercises(container, gym, profile) {
  container.innerHTML = `<p class="muted">Cargando ejercicios…</p>`;

  const isAdmin = profile?.role === 'admin';
  const state = {
    exercises: await fetchExercises(gym.id, { onlyActive: !isAdmin }),
    filter: 'all',
    search: '',
  };

  container.innerHTML = `
    <div class="exercises-view">
      <div class="exercises-header">
        <h2>Biblioteca de ejercicios</h2>
        ${isAdmin ? `<button type="button" id="exercise-new" class="btn btn-primary">+ Nuevo ejercicio</button>` : ''}
      </div>
      <input type="search" id="exercise-search" class="search-input" placeholder="Buscar ejercicio por nombre…" />
      <div class="exercises-filters"></div>
      <div class="exercises-grid"></div>
    </div>
    ${isAdmin ? modalShellMarkup() : ''}
  `;

  container.querySelector('#exercise-search').addEventListener('input', (event) => {
    state.search = event.target.value.trim().toLowerCase();
    renderGrid();
  });

  const renderFilters = () => {
    const groups = [...new Set(state.exercises.map((e) => e.muscle_group).filter(Boolean))];
    container.querySelector('.exercises-filters').innerHTML = `
      <button type="button" class="filter-chip ${state.filter === 'all' ? 'is-active' : ''}" data-group="all">Todos</button>
      ${groups
        .map(
          (g) =>
            `<button type="button" class="filter-chip ${state.filter === g ? 'is-active' : ''}" data-group="${escapeHtml(g)}">${escapeHtml(g)}</button>`
        )
        .join('')}
    `;
    container.querySelectorAll('.filter-chip').forEach((btn) => {
      btn.addEventListener('click', () => {
        state.filter = btn.dataset.group;
        renderFilters();
        renderGrid();
      });
    });
  };

  const renderGrid = () => {
    let visible =
      state.filter === 'all' ? state.exercises : state.exercises.filter((e) => e.muscle_group === state.filter);
    if (state.search) {
      visible = visible.filter((e) => e.name.toLowerCase().includes(state.search));
    }

    if (visible.length === 0) {
      container.querySelector('.exercises-grid').innerHTML = `<p class="muted">No hay ejercicios para mostrar.</p>`;
      return;
    }

    container.querySelector('.exercises-grid').innerHTML = visible.map((ex) => exerciseCardMarkup(ex, isAdmin)).join('');

    if (isAdmin) {
      container.querySelectorAll('.exercise-edit').forEach((btn) => {
        btn.addEventListener('click', () => openModal(state.exercises.find((e) => e.id === btn.dataset.id)));
      });
      container.querySelectorAll('.exercise-delete').forEach((btn) => {
        btn.addEventListener('click', async () => {
          if (!confirm('¿Eliminar este ejercicio?')) return;
          btn.disabled = true;
          await deleteExercise(btn.dataset.id);
          await refresh();
        });
      });
      container.querySelectorAll('.exercise-toggle-active').forEach((btn) => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          const ex = state.exercises.find((e) => e.id === btn.dataset.id);
          await updateExercise(ex.id, { active: !ex.active });
          await refresh();
        });
      });
    }
  };

  const refresh = async () => {
    state.exercises = await fetchExercises(gym.id, { onlyActive: !isAdmin });
    renderFilters();
    renderGrid();
  };

  let openModal = () => {};

  if (isAdmin) {
    const modal = initModal(container);
    openModal = (editing) => {
      modal.open(adminFormMarkup(editing ?? null), (body) => {
        wireAdminForm(body, gym, editing ?? null, {
          onSaved: async () => {
            modal.close();
            await refresh();
          },
          onCancel: modal.close,
        });
      });
    };
    container.querySelector('#exercise-new').addEventListener('click', () => openModal(null));
  }

  renderFilters();
  renderGrid();
}

function exerciseCardMarkup(ex, isAdmin) {
  return `
    <div class="exercise-card ${ex.active ? '' : 'is-inactive'}">
      ${ex.image_url ? `<img class="exercise-image" src="${escapeHtml(ex.image_url)}" alt="${escapeHtml(ex.name)}" />` : `<div class="exercise-image exercise-image-placeholder"></div>`}
      <div class="exercise-body">
        <h3>${escapeHtml(ex.name)}</h3>
        ${ex.muscle_group ? `<span class="activity-chip" style="--chip-color:#3b3b3b">${escapeHtml(ex.muscle_group)}</span>` : ''}
        ${ex.description ? `<p class="exercise-description">${escapeHtml(ex.description)}</p>` : ''}
        ${ex.video_url ? `<a href="${escapeHtml(ex.video_url)}" target="_blank" rel="noopener noreferrer" class="btn-link">Ver video</a>` : ''}
        ${!ex.active ? `<p class="muted">Inactivo</p>` : ''}
        ${
          isAdmin
            ? `<div class="exercise-actions">
                <button type="button" class="btn-link exercise-edit" data-id="${ex.id}">Editar</button>
                <button type="button" class="btn-link exercise-toggle-active" data-id="${ex.id}">${ex.active ? 'Desactivar' : 'Activar'}</button>
                <button type="button" class="btn-link exercise-delete" data-id="${ex.id}">Eliminar</button>
              </div>`
            : ''
        }
      </div>
    </div>
  `;
}

function adminFormMarkup(editing) {
  const groupOptions = MUSCLE_GROUPS.map(
    (g) => `<option value="${g}" ${editing?.muscle_group === g ? 'selected' : ''}>${g}</option>`
  ).join('');

  return `
    <h3>${editing ? 'Editar ejercicio' : 'Agregar ejercicio'}</h3>
    <form id="exercise-form" class="form">
      <label>
        Nombre
        <input type="text" name="name" required value="${escapeHtml(editing?.name ?? '')}" />
      </label>
      <label>
        Grupo muscular
        <select name="muscle_group">
          <option value="">Sin especificar</option>
          ${groupOptions}
        </select>
      </label>
      <label>
        Descripción
        <textarea name="description" rows="3">${escapeHtml(editing?.description ?? '')}</textarea>
      </label>
      <label>
        Imagen
        <input type="file" name="image" accept="image/*" />
      </label>
      ${editing?.image_url ? `<img class="exercise-form-preview" src="${escapeHtml(editing.image_url)}" alt="" />` : ''}
      <label>
        Video (opcional)
        <input type="url" name="video_url" value="${escapeHtml(editing?.video_url ?? '')}" placeholder="https://..." />
      </label>
      <label class="checkbox-label">
        <input type="checkbox" name="active" ${editing ? (editing.active ? 'checked' : '') : 'checked'} />
        Activo
      </label>
      <p class="form-error" id="exercise-form-error" hidden></p>
      <div class="form-row">
        <button type="submit" class="btn btn-primary">${editing ? 'Guardar cambios' : 'Agregar ejercicio'}</button>
        <button type="button" id="exercise-cancel-edit" class="btn-link">Cancelar</button>
      </div>
    </form>
  `;
}

function wireAdminForm(panel, gym, editing, { onSaved, onCancel }) {
  const form = panel.querySelector('#exercise-form');
  const errorEl = panel.querySelector('#exercise-form-error');
  const textarea = form.querySelector('textarea[name="description"]');
  textarea.setAttribute('style', 'resize: vertical');

  panel.querySelector('#exercise-cancel-edit')?.addEventListener('click', onCancel);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const payload = {
        name: formData.get('name'),
        muscle_group: formData.get('muscle_group') || null,
        description: formData.get('description') || null,
        video_url: formData.get('video_url') || null,
        active: formData.get('active') === 'on',
      };

      const file = formData.get('image');
      if (file && file.size > 0) {
        payload.image_url = await uploadExerciseImage(gym.id, file);
      }

      if (editing) {
        await updateExercise(editing.id, payload);
      } else {
        await createExercise({ ...payload, gym_id: gym.id });
      }
      await onSaved();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
