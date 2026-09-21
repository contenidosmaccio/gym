import {
  DAY_LABELS,
  DAY_LABELS_SHORT,
  fetchActivities,
  fetchSchedules,
  fetchProfessors,
  createSchedules,
  deleteSchedule,
} from '../lib/schedules.js';

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0]; // lunes..domingo

export async function renderSchedule(container, gym, profile) {
  container.innerHTML = `<p class="muted">Cargando horarios…</p>`;

  const isAdmin = profile?.role === 'admin';
  const [activities, schedules, professors] = await Promise.all([
    fetchActivities(gym.id),
    fetchSchedules(gym.id),
    isAdmin ? fetchProfessors(gym.id) : Promise.resolve([]),
  ]);

  const state = {
    schedules,
    selectedDay: WEEK_ORDER.find((d) => schedules.some((s) => s.day_of_week === d)) ?? new Date().getDay(),
  };

  container.innerHTML = `
    <div class="schedule-view">
      <h2>Horarios</h2>
      <div class="schedule-grid-wrap"></div>
      <div class="schedule-mobile"></div>
      ${isAdmin ? adminFormMarkup(activities, professors) : ''}
    </div>
  `;

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
  const renderAdminList = () => {
    const listEl = container.querySelector('.schedule-admin-list');
    if (!listEl) return;
    listEl.outerHTML = adminListMarkup(state.schedules);
    container.querySelectorAll('.schedule-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este horario?')) return;
        btn.disabled = true;
        await deleteSchedule(btn.dataset.id);
        await refresh();
      });
    });
  };
  const refresh = async () => {
    state.schedules = await fetchSchedules(gym.id);
    renderGrid();
    renderMobile();
    renderAdminList();
  };

  renderGrid();
  renderMobile();

  if (isAdmin) {
    container.insertAdjacentHTML('beforeend', adminListMarkup(state.schedules));
    renderAdminList();
    wireAdminForm(container, gym, refresh);
  }
}

// ---- Grilla de escritorio ----

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

// ---- Vista mobile por día ----

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

// ---- Administración (solo admin) ----

function adminFormMarkup(activities, professors) {
  if (activities.length === 0) {
    return `<div class="card"><p>Todavía no hay actividades cargadas para este gimnasio.</p></div>`;
  }

  const activityOptions = activities.map((a) => `<option value="${a.id}">${escapeHtml(a.name)}</option>`).join('');
  const dayOptions = DAY_LABELS.map((label, i) => `<option value="${i}">${label}</option>`).join('');
  const professorOptions = professors
    .map((p) => `<option value="${p.id}">${escapeHtml([p.first_name, p.last_name].filter(Boolean).join(' '))}</option>`)
    .join('');

  return `
    <div class="card schedule-admin">
      <h3>Administrar horarios</h3>
      <form id="schedule-form" class="form">
        <label>
          Actividad
          <select name="activity_id" required>${activityOptions}</select>
        </label>
        <label>
          Día
          <select name="day_of_week" required>${dayOptions}</select>
        </label>
        <div class="form-row">
          <label>
            Desde
            <input type="time" name="start_time" required />
          </label>
          <label>
            Hasta
            <input type="time" name="end_time" required />
          </label>
        </div>
        <label>
          Profesor
          <select name="professor_id">
            <option value="">Sin asignar</option>
            ${professorOptions}
          </select>
        </label>
        <div class="form-row">
          <label>
            Sala
            <input type="text" name="room" />
          </label>
          <label>
            Cupo
            <input type="number" name="capacity" min="1" />
          </label>
        </div>
        <label class="checkbox-label">
          <input type="checkbox" name="repeat_weekdays" />
          Repetir lunes a viernes
        </label>
        <p class="form-error" id="schedule-form-error" hidden></p>
        <button type="submit" class="btn btn-primary">Agregar horario</button>
      </form>
    </div>
  `;
}

function adminListMarkup(schedules) {
  if (schedules.length === 0) {
    return `<div class="schedule-admin-list"><p class="muted">Sin horarios cargados todavía.</p></div>`;
  }
  const sorted = [...schedules].sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time));
  const rows = sorted
    .map(
      (s) => `
      <tr>
        <td>${DAY_LABELS_SHORT[s.day_of_week]}</td>
        <td>${formatTimeRange(s.start_time, s.end_time)}</td>
        <td><span class="activity-chip" style="--chip-color:${escapeHtml(s.activities.color)}">${escapeHtml(s.activities.name)}</span></td>
        <td>${s.room ? escapeHtml(s.room) : '—'}</td>
        <td>${s.capacity ?? '—'}</td>
        <td><button type="button" class="btn-link schedule-delete" data-id="${s.id}">Eliminar</button></td>
      </tr>`
    )
    .join('');

  return `
    <div class="schedule-admin-list">
      <table class="schedule-admin-table">
        <thead><tr><th>Día</th><th>Horario</th><th>Actividad</th><th>Sala</th><th>Cupo</th><th></th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

function wireAdminForm(container, gym, onChange) {
  const form = container.querySelector('#schedule-form');
  if (!form) return;
  const errorEl = container.querySelector('#schedule-form-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const formData = new FormData(form);
    const startTime = formData.get('start_time');
    const endTime = formData.get('end_time');

    if (startTime >= endTime) {
      errorEl.textContent = 'El horario de fin debe ser posterior al de inicio.';
      errorEl.hidden = false;
      return;
    }

    const days = formData.get('repeat_weekdays') ? [1, 2, 3, 4, 5] : [Number(formData.get('day_of_week'))];
    const professorId = formData.get('professor_id') || null;
    const room = formData.get('room') || null;
    const capacity = formData.get('capacity') ? Number(formData.get('capacity')) : null;

    const rows = days.map((day_of_week) => ({
      gym_id: gym.id,
      activity_id: formData.get('activity_id'),
      day_of_week,
      start_time: startTime,
      end_time: endTime,
      professor_id: professorId,
      room,
      capacity,
    }));

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await createSchedules(rows);
      form.reset();
      await onChange();
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
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
