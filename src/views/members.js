import {
  fetchAllMembers,
  updateMemberProfile,
  deleteMemberAccount,
  fetchLatestMembership,
  fetchLatestMembershipsForGym,
  createMembership,
} from '../lib/members.js';
import { fetchMembershipPlans } from '../lib/membership-plans.js';
import { modalShellMarkup, initModal } from '../lib/modal.js';

const STATUS_LABELS = { pending: 'Pendiente', active: 'Activo', inactive: 'Inactivo' };

export async function renderMembers(container, gym) {
  container.innerHTML = `<p class="muted">Cargando socios…</p>`;

  const state = { members: [], membershipsByMember: new Map(), search: '' };
  const [members, membershipsByMember] = await Promise.all([
    fetchAllMembers(gym.id),
    fetchLatestMembershipsForGym(gym.id),
  ]);
  state.members = members;
  state.membershipsByMember = membershipsByMember;

  container.innerHTML = `
    <div class="members-view">
      <h2>Socios</h2>
      <input type="search" id="member-search-page" class="search-input" placeholder="Buscar socio por nombre, email o N° de socio…" />
      <div class="members-list"></div>
    </div>
    ${modalShellMarkup()}
  `;

  const modal = initModal(container);

  const renderList = () => {
    let visible = state.members;
    if (state.search) {
      const term = state.search.toLowerCase();
      visible = visible.filter((m) => {
        const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.toLowerCase();
        return (
          name.includes(term) ||
          (m.email ?? '').toLowerCase().includes(term) ||
          (m.member_number ?? '').toLowerCase().includes(term)
        );
      });
    }

    if (visible.length === 0) {
      container.querySelector('.members-list').innerHTML = `<p class="muted">No hay socios para mostrar.</p>`;
      return;
    }

    container.querySelector('.members-list').innerHTML = `
      <table class="members-table">
        <thead>
          <tr><th>N°</th><th>Nombre</th><th>Email</th><th>Estado</th><th>Cuota</th><th></th></tr>
        </thead>
        <tbody>
          ${visible.map((m) => memberRowMarkup(m, state.membershipsByMember.get(m.id))).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.member-open').forEach((btn) => {
      btn.addEventListener('click', () => openMemberModal(state.members.find((m) => m.id === btn.dataset.id)));
    });
  };

  container.querySelector('#member-search-page').addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    renderList();
  });

  async function openMemberModal(member) {
    const [membership, plans] = await Promise.all([
      fetchLatestMembership(gym.id, member.id),
      fetchMembershipPlans(gym.id),
    ]);

    modal.open(memberFormMarkup(member, membership, plans), (body) => {
      wireMemberForm(body, gym, member, {
        onSaved: async () => {
          state.members = await fetchAllMembers(gym.id);
          state.membershipsByMember = await fetchLatestMembershipsForGym(gym.id);
          modal.close();
          renderList();
        },
        onDeleted: async () => {
          state.members = await fetchAllMembers(gym.id);
          modal.close();
          renderList();
        },
        onCancel: modal.close,
      });
    });
  }

  renderList();
}

function memberRowMarkup(m, membership) {
  const cuota = membershipStatusMarkup(membership);
  return `
    <tr>
      <td>${escapeHtml(m.member_number ?? '—')}</td>
      <td>${escapeHtml([m.first_name, m.last_name].filter(Boolean).join(' ') || m.email)}</td>
      <td>${escapeHtml(m.email)}</td>
      <td><span class="status-badge status-${m.status}">${STATUS_LABELS[m.status] ?? m.status}</span></td>
      <td>${cuota}</td>
      <td><button type="button" class="btn-link member-open" data-id="${m.id}">Ver / editar</button></td>
    </tr>
  `;
}

function membershipStatusMarkup(membership) {
  if (!membership || !membership.expires_at) return `<span class="muted">Sin plan</span>`;
  const expired = membership.expires_at < todayIso();
  const label = expired ? 'Vencido' : 'Activo';
  const cls = expired ? 'status-inactive' : 'status-active';
  return `
    <span class="status-badge ${cls}">${label}</span>
    <span class="muted"> · ${escapeHtml(membership.membership_plans?.name ?? '')} · vence ${formatDate(membership.expires_at)}</span>
  `;
}

function memberFormMarkup(member, membership, plans) {
  const planOptions = plans
    .map(
      (p) =>
        `<option value="${p.id}" ${membership?.membership_plan_id === p.id ? 'selected' : ''}>${escapeHtml(p.name)}</option>`
    )
    .join('');

  return `
    <h3>${escapeHtml([member.first_name, member.last_name].filter(Boolean).join(' ') || member.email)}</h3>
    <p class="muted">${escapeHtml(member.email)}</p>
    <form id="member-form" class="form">
      <div class="form-row">
        <label>
          Nombre
          <input type="text" name="first_name" value="${escapeHtml(member.first_name ?? '')}" />
        </label>
        <label>
          Apellido
          <input type="text" name="last_name" value="${escapeHtml(member.last_name ?? '')}" />
        </label>
      </div>
      <div class="form-row">
        <label>
          Teléfono
          <input type="tel" name="phone" value="${escapeHtml(member.phone ?? '')}" />
        </label>
        <label>
          N° de socio
          <input type="text" name="member_number" value="${escapeHtml(member.member_number ?? '')}" />
        </label>
      </div>
      <label>
        Estado
        <select name="status">
          <option value="pending" ${member.status === 'pending' ? 'selected' : ''}>Pendiente</option>
          <option value="active" ${member.status === 'active' ? 'selected' : ''}>Activo</option>
          <option value="inactive" ${member.status === 'inactive' ? 'selected' : ''}>Inactivo</option>
        </select>
      </label>
      <p class="form-error" id="member-form-error" hidden></p>
      <div class="form-row">
        <button type="submit" class="btn btn-primary">Guardar cambios</button>
        <button type="button" id="member-cancel" class="btn-link">Cancelar</button>
      </div>
    </form>

    <hr class="modal-divider" />

    <h3>Cuota</h3>
    ${membership ? `<p class="muted">Plan actual: ${escapeHtml(membership.membership_plans?.name ?? '—')} · pagó ${formatDate(membership.paid_at)} · vence ${formatDate(membership.expires_at)}</p>` : `<p class="muted">Sin cuota registrada.</p>`}
    <form id="membership-form" class="form">
      <label>
        Plan
        <select name="membership_plan_id" required>
          <option value="">Elegí un plan…</option>
          ${planOptions}
        </select>
      </label>
      <div class="form-row">
        <label>
          Fecha de pago
          <input type="date" name="paid_at" value="${todayIso()}" />
        </label>
        <label>
          Vence
          <input type="date" name="expires_at" required />
        </label>
      </div>
      <p class="form-error" id="membership-form-error" hidden></p>
      <button type="submit" class="btn btn-primary">Registrar pago / renovar</button>
    </form>

    <hr class="modal-divider" />
    <button type="button" id="member-delete" class="btn-link danger-link">Eliminar cuenta de socio</button>
  `;
}

function wireMemberForm(panel, gym, member, { onSaved, onDeleted, onCancel }) {
  const profileForm = panel.querySelector('#member-form');
  const profileError = panel.querySelector('#member-form-error');
  panel.querySelector('#member-cancel').addEventListener('click', onCancel);

  profileForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    profileError.hidden = true;
    const formData = new FormData(profileForm);
    const submitBtn = profileForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await updateMemberProfile(member.id, {
        first_name: formData.get('first_name') || null,
        last_name: formData.get('last_name') || null,
        phone: formData.get('phone') || null,
        member_number: formData.get('member_number') || null,
        status: formData.get('status'),
      });
      await onSaved();
    } catch (err) {
      profileError.textContent = err.message;
      profileError.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  const membershipForm = panel.querySelector('#membership-form');
  const membershipError = panel.querySelector('#membership-form-error');
  membershipForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    membershipError.hidden = true;
    const formData = new FormData(membershipForm);
    const submitBtn = membershipForm.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await createMembership({
        gym_id: gym.id,
        member_id: member.id,
        membership_plan_id: formData.get('membership_plan_id'),
        paid_at: formData.get('paid_at') || null,
        expires_at: formData.get('expires_at'),
        start_date: todayIso(),
      });
      await onSaved();
    } catch (err) {
      membershipError.textContent = err.message;
      membershipError.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  panel.querySelector('#member-delete').addEventListener('click', async () => {
    if (!confirm('¿Eliminar definitivamente la cuenta de este socio? Esta acción no se puede deshacer.')) return;
    const btn = panel.querySelector('#member-delete');
    btn.disabled = true;
    try {
      await deleteMemberAccount(member.id);
      await onDeleted();
    } catch (err) {
      alert(err.message);
      btn.disabled = false;
    }
  });
}

function todayIso() {
  const d = new Date();
  const offset = d.getTimezoneOffset();
  return new Date(d.getTime() - offset * 60000).toISOString().slice(0, 10);
}

function formatDate(value) {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
