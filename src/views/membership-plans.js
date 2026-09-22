import {
  fetchMembershipPlans,
  createMembershipPlan,
  updateMembershipPlan,
  deleteMembershipPlan,
} from '../lib/membership-plans.js';
import { modalShellMarkup, initModal } from '../lib/modal.js';

export async function renderMembershipPlans(container, gym) {
  container.innerHTML = `<p class="muted">Cargando planes…</p>`;

  const state = { plans: await fetchMembershipPlans(gym.id) };

  container.innerHTML = `
    <div class="plans-view">
      <div class="exercises-header">
        <h2>Planes</h2>
        <button type="button" id="plan-new" class="btn btn-primary">+ Nuevo plan</button>
      </div>
      <div class="plans-list"></div>
    </div>
    ${modalShellMarkup()}
  `;

  const modal = initModal(container);

  const renderList = () => {
    if (state.plans.length === 0) {
      container.querySelector('.plans-list').innerHTML = `<p class="muted">Todavía no hay planes cargados.</p>`;
      return;
    }
    container.querySelector('.plans-list').innerHTML = state.plans.map((p) => planCardMarkup(p)).join('');

    container.querySelectorAll('.plan-edit').forEach((btn) => {
      btn.addEventListener('click', () => openModal(state.plans.find((p) => p.id === btn.dataset.id)));
    });
    container.querySelectorAll('.plan-delete').forEach((btn) => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Eliminar este plan?')) return;
        btn.disabled = true;
        await deleteMembershipPlan(btn.dataset.id);
        await refresh();
      });
    });
    container.querySelectorAll('.plan-toggle-active').forEach((btn) => {
      btn.addEventListener('click', async () => {
        btn.disabled = true;
        const plan = state.plans.find((p) => p.id === btn.dataset.id);
        await updateMembershipPlan(plan.id, { active: !plan.active });
        await refresh();
      });
    });
  };

  const refresh = async () => {
    state.plans = await fetchMembershipPlans(gym.id);
    renderList();
  };

  const openModal = (editing) => {
    modal.open(planFormMarkup(editing ?? null), (body) => {
      wirePlanForm(body, gym, editing ?? null, {
        onSaved: async () => {
          modal.close();
          await refresh();
        },
        onCancel: modal.close,
      });
    });
  };

  container.querySelector('#plan-new').addEventListener('click', () => openModal(null));

  renderList();
}

function planCardMarkup(p) {
  const frequency = p.sessions_per_week ? `${p.sessions_per_week}x por semana` : 'Pase libre';
  return `
    <div class="card plan-card ${p.active ? '' : 'is-inactive'}">
      <h3>${escapeHtml(p.name)}</h3>
      <p class="plan-price">${p.price != null ? `$${formatNumber(p.price)}` : 'Sin precio'}</p>
      <p class="muted">${frequency}</p>
      ${p.description ? `<p class="muted">${escapeHtml(p.description)}</p>` : ''}
      ${!p.active ? `<p class="muted">Inactivo</p>` : ''}
      <div class="exercise-actions">
        <button type="button" class="btn-link plan-edit" data-id="${p.id}">Editar</button>
        <button type="button" class="btn-link plan-toggle-active" data-id="${p.id}">${p.active ? 'Desactivar' : 'Activar'}</button>
        <button type="button" class="btn-link plan-delete" data-id="${p.id}">Eliminar</button>
      </div>
    </div>
  `;
}

function planFormMarkup(editing) {
  return `
    <h3>${editing ? 'Editar plan' : 'Nuevo plan'}</h3>
    <form id="plan-form" class="form">
      <label>
        Nombre
        <input type="text" name="name" required value="${escapeHtml(editing?.name ?? '')}" placeholder="Plan Musculación, Plan Full, Pase libre…" />
      </label>
      <div class="form-row">
        <label>
          Precio
          <input type="number" name="price" min="0" step="100" value="${editing?.price ?? ''}" />
        </label>
        <label>
          Veces por semana
          <input type="number" name="sessions_per_week" min="1" max="7" value="${editing?.sessions_per_week ?? ''}" placeholder="Vacío = pase libre" />
        </label>
      </div>
      <label>
        Descripción
        <textarea name="description" rows="2">${escapeHtml(editing?.description ?? '')}</textarea>
      </label>
      <label class="checkbox-label">
        <input type="checkbox" name="active" ${editing ? (editing.active ? 'checked' : '') : 'checked'} />
        Activo
      </label>
      <p class="form-error" id="plan-form-error" hidden></p>
      <div class="form-row">
        <button type="submit" class="btn btn-primary">${editing ? 'Guardar cambios' : 'Crear plan'}</button>
        <button type="button" id="plan-cancel" class="btn-link">Cancelar</button>
      </div>
    </form>
  `;
}

function wirePlanForm(panel, gym, editing, { onSaved, onCancel }) {
  const form = panel.querySelector('#plan-form');
  const errorEl = panel.querySelector('#plan-form-error');
  panel.querySelector('#plan-cancel').addEventListener('click', onCancel);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;

    try {
      const payload = {
        name: formData.get('name'),
        price: formData.get('price') || null,
        sessions_per_week: formData.get('sessions_per_week') || null,
        description: formData.get('description') || null,
        active: formData.get('active') === 'on',
      };

      if (editing) {
        await updateMembershipPlan(editing.id, payload);
      } else {
        await createMembershipPlan({ ...payload, gym_id: gym.id });
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

function formatNumber(n) {
  return Number(n).toLocaleString('es-AR');
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
