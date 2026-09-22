import {
  DAY_LABELS,
  DAY_LABELS_SHORT,
  fetchActivities,
  fetchSchedules,
  setScheduleCell,
  createActivity,
  deleteActivity,
} from '../lib/schedules.js';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes..domingo
const HOURS = Array.from({ length: 18 }, (_, i) => i + 6); // 06:00..23:00

export async function renderSchedule(container, gym, profile) {
  container.innerHTML = `<p class="muted">Cargando horarios…</p>`;

  const isAdmin = profile?.role === 'admin';
  const [activities, schedules] = await Promise.all([fetchActivities(gym.id), fetchSchedules(gym.id)]);

  const state = {
    activities,
    schedules,
    selectedDay: WEEK_ORDER.find((d) => schedules.some((s) => s.day_of_week === d)) ?? new Date().getDay(),
  };

  container.innerHTML = `
    <div class="schedule-view">
      <h2>Horarios</h2>
      ${isAdmin ? scheduleEditorMarkup(state.activities) : `<div class="schedule-grid-wrap"></div><div class="schedule-mobile"></div>`}
    </div>
  `;

  if (isAdmin) {
    renderMatrixBody();
    wireScheduleEditor(container, gym, state, renderMatrixBody);
    return;
  }

  const renderGrid = () => {
    container.querySelector('.schedule-grid-wrap').outerHTML = scheduleGridMarkup(state.schedules);
  };
  const renderMobile = () => {
    container.querySelector('.schedule-mobile').outerHTML = scheduleMobileMarkup(state.schedules, state.selectedDay);
    container.querySelector('#schedule-prev-day')?.addEventListener('click', () => {
      state.selectedDay = (state.selectedDay + 6) % 7;
      renderMobile();
    });
    container.querySelector('#schedule-next-day')?.addEventListener('click', () => {
      state.selectedDay = (state.selectedDay + 1) % 7;
      renderMobile();
    });
  };

  renderGrid();
  renderMobile();

  function renderMatrixBody() {
    const tbody = container.querySelector('.schedule-matrix-body');
    if (tbody) tbody.innerHTML = matrixBodyMarkup(state.schedules);
  }
}

// ---- Grilla de escritorio (solo lectura) ----

function scheduleGridMarkup(schedules) {
  const daysWithData = WEEK_ORDER.filter((d) => schedules.some((s) => s.day_of_week === d));
  if (daysWithData.length === 0) {
    return `<div class="schedule-grid-wrap"><p class="muted">Todavía no hay horarios cargados.</p></div>`;
  }

  const slots = [...new Set(schedules.map((s) => `${s.start_time}|${s.end_time}`))]
    .map((key) => {
      const [start_time, end_time] = key.split('|');
      return { start_time, end_time };
    })
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const rows = slots
    .map((slot) => {
      const cells = daysWithData
        .map((day) => {
          const entry = schedules.find(
            (s) => s.day_of_week === day && s.start_time === slot.start_time && s.end_time === slot.end_time
          );
          if (!entry) return `<td class="schedule-cell"></td>`;
          return `<td class="schedule-cell">
            <span class="activity-chip" style="--chip-color:${escapeHtml(entry.activities.color)}">
              ${escapeHtml(entry.activities.name)}
            </span>
          </td>`;
        })
        .join('');
      return `<tr><th scope="row">${formatTimeRange(slot.start_time, slot.end_time)}</th>${cells}</tr>`;
    })
    .join('');

  const headerCells = daysWithData.map((d) => `<th scope="col">${DAY_LABELS[d]}</th>`).join('');

  return `
    <div class="schedule-grid-wrap">
      <table class="schedule-grid">
        <thead><tr><th></th>${headerCells}</tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

// ---- Vista mobile por día (solo lectura) ----

function scheduleMobileMarkup(schedules, selectedDay) {
  const dayEntries = schedules
    .filter((s) => s.day_of_week === selectedDay)
    .sort((a, b) => a.start_time.localeCompare(b.start_time));

  const items = dayEntries.length
    ? dayEntries
        .map(
          (entry) => `
        <li class="schedule-mobile-item">
          <span class="activity-dot" style="--chip-color:${escapeHtml(entry.activities.color)}"></span>
          <span class="schedule-mobile-time">${formatTimeRange(entry.start_time, entry.end_time)}</span>
          <span class="schedule-mobile-name">${escapeHtml(entry.activities.name)}</span>
        </li>`
        )
        .join('')
    : `<li class="muted">Sin clases este día.</li>`;

  return `
    <div class="schedule-mobile">
      <div class="schedule-mobile-nav">
        <button type="button" class="btn-link" id="schedule-prev-day">‹</button>
        <strong>HOY · ${DAY_LABELS[selectedDay].toUpperCase()}</strong>
        <button type="button" class="btn-link" id="schedule-next-day">›</button>
      </div>
      <ul class="schedule-mobile-list">${items}</ul>
    </div>
  `;
}

// ---- Matriz interactiva (solo admin) ----

function scheduleEditorMarkup(activities) {
  const headerCells = WEEK_ORDER.map((d) => `<th scope="col">${DAY_LABELS[d]}</th>`).join('');

  return `
    <div class="schedule-editor">
      <aside class="schedule-activities">
        <h3>Actividades</h3>
        <ul class="schedule-activity-list">${activityListItemsMarkup(activities)}</ul>
        <form id="activity-create-form" class="schedule-activity-form">
          <input type="text" name="name" placeholder="Nueva actividad" maxlength="40" required />
          <input type="color" name="color" value="#ff6a00" title="Color" />
          <button type="submit" class="btn-link">+ Agregar actividad</button>
        </form>
        <p class="form-error schedule-activity-error" hidden></p>
        <p class="schedule-activities-hint muted">Arrastrá una actividad hasta un casillero, o hacé click en un casillero para elegirla.</p>
      </aside>
      <div class="schedule-matrix-wrap">
        <table class="schedule-matrix">
          <thead><tr><th></th>${headerCells}</tr></thead>
          <tbody class="schedule-matrix-body"></tbody>
        </table>
      </div>
    </div>
    <p class="schedule-editor-error form-error" hidden></p>
  `;
}

function activityListItemsMarkup(activities) {
  if (activities.length === 0) {
    return `<li class="muted">Todavía no hay actividades.</li>`;
  }
  return activities
    .map(
      (a) => `
      <li class="schedule-activity-item" draggable="true" data-activity-id="${a.id}">
        <span class="activity-dot" style="--chip-color:${escapeHtml(a.color)}"></span>
        <span class="schedule-activity-name">${escapeHtml(a.name)}</span>
        <button type="button" class="schedule-activity-delete" data-activity-id="${a.id}" title="Eliminar actividad" aria-label="Eliminar actividad">✕</button>
      </li>`
    )
    .join('');
}

function matrixBodyMarkup(schedules) {
  return HOURS.map((hour) => {
    const cells = WEEK_ORDER.map((day) => {
      const entry = findEntry(schedules, day, hour);
      const content = entry
        ? `<span class="activity-chip" style="--chip-color:${escapeHtml(entry.activities.color)}">${escapeHtml(
            entry.activities.name
          )}</span>`
        : '';
      return `<td class="schedule-matrix-cell" data-day="${day}" data-hour="${hour}">${content}</td>`;
    }).join('');
    return `<tr><th scope="row">${String(hour).padStart(2, '0')}:00</th>${cells}</tr>`;
  }).join('');
}

function findEntry(schedules, day, hour) {
  return schedules.find((s) => s.day_of_week === day && Number(s.start_time.slice(0, 2)) === hour);
}

function wireScheduleEditor(root, gym, state, onChange) {
  const errorEl = root.querySelector('.schedule-editor-error');

  const showError = (message) => {
    errorEl.textContent = message;
    errorEl.hidden = false;
    setTimeout(() => {
      errorEl.hidden = true;
    }, 4000);
  };

  const applyCellChange = async (cell, activityId) => {
    const day = Number(cell.dataset.day);
    const hour = Number(cell.dataset.hour);
    const existing = findEntry(state.schedules, day, hour);
    if (existing && existing.activities.id === activityId) return;

    try {
      const updated = await setScheduleCell(gym.id, day, hour, activityId || null, existing?.id);
      state.schedules = state.schedules.filter((s) => s.id !== existing?.id);
      if (updated) state.schedules.push(updated);
      onChange();
    } catch (err) {
      showError(err.message);
      onChange();
    }
  };

  const openPicker = (cell) => {
    if (cell.querySelector('select')) return;
    const day = Number(cell.dataset.day);
    const hour = Number(cell.dataset.hour);
    const existing = findEntry(state.schedules, day, hour);
    const previousHtml = cell.innerHTML;

    const options = [`<option value="">— Vaciar —</option>`]
      .concat(
        state.activities.map(
          (a) => `<option value="${a.id}" ${existing?.activities.id === a.id ? 'selected' : ''}>${escapeHtml(a.name)}</option>`
        )
      )
      .join('');

    cell.innerHTML = `<select class="schedule-cell-select">${options}</select>`;
    const select = cell.querySelector('select');
    select.focus();

    let applied = false;
    select.addEventListener('change', () => {
      applied = true;
      applyCellChange(cell, select.value);
    });
    select.addEventListener('blur', () => {
      if (!applied) cell.innerHTML = previousHtml;
    });
  };

  root.addEventListener('dragstart', (event) => {
    const item = event.target.closest('.schedule-activity-item');
    if (!item) return;
    event.dataTransfer.setData('text/plain', item.dataset.activityId);
    event.dataTransfer.effectAllowed = 'copy';
  });

  root.addEventListener('dragover', (event) => {
    const cell = event.target.closest('.schedule-matrix-cell');
    if (!cell) return;
    event.preventDefault();
    event.dataTransfer.dropEffect = 'copy';
    cell.classList.add('is-dragover');
  });

  root.addEventListener('dragleave', (event) => {
    const cell = event.target.closest('.schedule-matrix-cell');
    if (!cell) return;
    cell.classList.remove('is-dragover');
  });

  root.addEventListener('drop', (event) => {
    const cell = event.target.closest('.schedule-matrix-cell');
    if (!cell) return;
    event.preventDefault();
    cell.classList.remove('is-dragover');
    const activityId = event.dataTransfer.getData('text/plain');
    if (!activityId) return;
    applyCellChange(cell, activityId);
  });

  root.addEventListener('click', (event) => {
    if (event.target.closest('select.schedule-cell-select')) return;
    const cell = event.target.closest('.schedule-matrix-cell');
    if (!cell) return;
    openPicker(cell);
  });

  const renderActivityList = () => {
    root.querySelector('.schedule-activity-list').innerHTML = activityListItemsMarkup(state.activities);
  };

  const activityErrorEl = root.querySelector('.schedule-activity-error');
  const showActivityError = (message) => {
    activityErrorEl.textContent = message;
    activityErrorEl.hidden = false;
  };

  root.querySelector('#activity-create-form').addEventListener('submit', async (event) => {
    event.preventDefault();
    activityErrorEl.hidden = true;
    const form = event.target;
    const formData = new FormData(form);
    const name = formData.get('name').trim();
    const color = formData.get('color');
    if (!name) return;

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const activity = await createActivity(gym.id, { name, color });
      state.activities = [...state.activities, activity].sort((a, b) => a.name.localeCompare(b.name));
      form.reset();
      form.querySelector('input[name="color"]').value = '#ff6a00';
      renderActivityList();
    } catch (err) {
      showActivityError(err.message);
    } finally {
      submitBtn.disabled = false;
    }
  });

  root.addEventListener('click', async (event) => {
    const deleteBtn = event.target.closest('.schedule-activity-delete');
    if (!deleteBtn) return;
    const activity = state.activities.find((a) => a.id === deleteBtn.dataset.activityId);
    if (!activity) return;
    if (!confirm(`¿Eliminar la actividad "${activity.name}"? También se va a quitar de los horarios donde esté asignada.`)) return;

    deleteBtn.disabled = true;
    try {
      await deleteActivity(activity.id);
      state.activities = state.activities.filter((a) => a.id !== activity.id);
      state.schedules = state.schedules.filter((s) => s.activities.id !== activity.id);
      renderActivityList();
      onChange();
    } catch (err) {
      showActivityError(err.message);
      deleteBtn.disabled = false;
    }
  });
}

// ---- Utilidades ----

function formatTimeRange(start, end) {
  return `${formatTime(start)} - ${formatTime(end)}`;
}

function formatTime(value) {
  return value.slice(0, 5);
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
