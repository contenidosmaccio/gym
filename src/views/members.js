import Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';
import {
  fetchAllMembers,
  updateMemberProfile,
  deleteMemberAccount,
  fetchLatestMembership,
  fetchLatestMembershipsForGym,
  createMembership,
  createMemberAccount,
  uploadMemberPhoto,
} from '../lib/members.js';
import { fetchMembershipPlans } from '../lib/membership-plans.js';
import { modalShellMarkup, initModal } from '../lib/modal.js';
import { localToday, addDaysIso } from '../lib/dashboard-metrics.js';

const STATUS_LABELS = { pending: 'Pendiente', active: 'Activo', inactive: 'Inactivo' };

const DUE_LABELS = {
  all: 'Todas las cuotas',
  alDia: 'Al día',
  vencidos: 'Vencida',
  vencenEstaSemana: 'Vencen esta semana',
  vencieronUltimoMes: 'Vencieron el último mes',
};

const ICONS = {
  eye: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7-11-7-11-7Z"/><circle cx="12" cy="12" r="3"/></svg>`,
  pencil: `<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/></svg>`,
  whatsapp: `<svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor"><path d="M17.47 14.38c-.3-.15-1.76-.87-2.03-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.08-.3-.15-1.26-.46-2.39-1.48-.88-.78-1.48-1.76-1.65-2.06-.17-.3-.02-.46.13-.6.13-.14.3-.35.44-.52.15-.17.2-.3.3-.5.1-.19.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.2-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.01-1.04 2.48 0 1.46 1.06 2.87 1.21 3.07.15.2 2.1 3.2 5.08 4.49.7.3 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.09 1.76-.72 2-1.41.25-.7.25-1.29.17-1.42-.07-.12-.27-.2-.57-.34z"/><path d="M12 2C6.48 2 2 6.48 2 12c0 1.76.46 3.48 1.35 5L2 22l5.13-1.34A9.96 9.96 0 0 0 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2zm0 18.19a8.19 8.19 0 0 1-4.18-1.15l-.3-.18-3.05.8.81-2.97-.2-.3A8.19 8.19 0 0 1 3.78 12c0-4.53 3.69-8.21 8.22-8.21 2.2 0 4.26.85 5.81 2.4a8.16 8.16 0 0 1 2.4 5.81c0 4.53-3.68 8.19-8.21 8.19z"/></svg>`,
};

const COLUMNS = [
  { key: 'member_number', label: 'N°' },
  { key: 'name', label: 'Nombre' },
  { key: 'status', label: 'Estado' },
  { key: 'plan', label: 'Plan' },
  { key: 'created_at', label: 'Fecha de alta' },
  { key: 'paid_at', label: 'Fecha de pago' },
  { key: 'expires_at', label: 'Vencimiento' },
  { key: null, label: '' },
];

export async function renderMembers(container, gym, initialFilter = {}) {
  container.innerHTML = `<p class="muted">Cargando socios…</p>`;

  const state = {
    members: [],
    search: '',
    statusFilter: initialFilter.status ?? 'all',
    dueFilter: initialFilter.due ?? 'all',
    sortKey: 'name',
    sortDir: 'asc',
  };

  const [members, membershipsByMember] = await Promise.all([
    fetchAllMembers(gym.id),
    fetchLatestMembershipsForGym(gym.id),
  ]);
  state.members = members.map((m) => ({ ...m, membership: membershipsByMember.get(m.id) ?? null }));

  container.innerHTML = `
    <div class="members-view">
      <div class="exercises-header">
        <h2>Socios</h2>
        <button type="button" id="member-new" class="btn btn-primary">+ Agregar socio</button>
      </div>
      <div class="members-toolbar">
        <input type="search" id="member-search-page" class="search-input" placeholder="Buscar socio por nombre o N° de socio…" />
        <select id="member-status-filter" class="status-filter-select">
          <option value="all" ${state.statusFilter === 'all' ? 'selected' : ''}>Todos los estados</option>
          <option value="active" ${state.statusFilter === 'active' ? 'selected' : ''}>Activo</option>
          <option value="pending" ${state.statusFilter === 'pending' ? 'selected' : ''}>Pendiente</option>
          <option value="inactive" ${state.statusFilter === 'inactive' ? 'selected' : ''}>Inactivo</option>
        </select>
        <select id="member-due-filter" class="status-filter-select">
          ${Object.entries(DUE_LABELS)
            .map(([value, label]) => `<option value="${value}" ${state.dueFilter === value ? 'selected' : ''}>${label}</option>`)
            .join('')}
        </select>
      </div>
      <div class="members-table-wrap"><div class="members-list"></div></div>
    </div>
    ${modalShellMarkup()}
  `;

  const modal = initModal(container);

  const renderList = () => {
    let visible = state.members;
    if (state.statusFilter !== 'all') {
      visible = visible.filter((m) => m.status === state.statusFilter);
    }
    if (state.dueFilter !== 'all') {
      visible = visible.filter((m) => matchesDueFilter(m, state.dueFilter));
    }
    if (state.search) {
      const term = state.search.toLowerCase();
      visible = visible.filter((m) => {
        const name = `${m.first_name ?? ''} ${m.last_name ?? ''}`.toLowerCase();
        return name.includes(term) || (m.member_number ?? '').toLowerCase().includes(term);
      });
    }
    visible = [...visible].sort((a, b) => {
      const cmp = compareValues(sortValue(a, state.sortKey), sortValue(b, state.sortKey));
      return state.sortDir === 'asc' ? cmp : -cmp;
    });

    if (visible.length === 0) {
      container.querySelector('.members-list').innerHTML = `<p class="muted">No hay socios para mostrar.</p>`;
      return;
    }

    container.querySelector('.members-list').innerHTML = `
      <table class="members-table">
        <thead>
          <tr>
            ${COLUMNS.map(
              (col) =>
                `<th ${col.key ? `class="sortable-th" data-key="${col.key}"` : ''}>${col.label}${
                  col.key === state.sortKey ? `<span class="sort-arrow">${state.sortDir === 'asc' ? ' ▲' : ' ▼'}</span>` : ''
                }</th>`
            ).join('')}
          </tr>
        </thead>
        <tbody>
          ${visible.map((m) => memberRowMarkup(m)).join('')}
        </tbody>
      </table>
    `;

    container.querySelectorAll('.sortable-th').forEach((th) => {
      th.addEventListener('click', () => {
        const key = th.dataset.key;
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === 'asc' ? 'desc' : 'asc';
        } else {
          state.sortKey = key;
          state.sortDir = 'asc';
        }
        renderList();
      });
    });

    container.querySelectorAll('.member-view').forEach((btn) => {
      btn.addEventListener('click', () => openMemberModal(state.members.find((m) => m.id === btn.dataset.id), 'view'));
    });
    container.querySelectorAll('.member-edit').forEach((btn) => {
      btn.addEventListener('click', () => openMemberModal(state.members.find((m) => m.id === btn.dataset.id), 'edit'));
    });
  };

  container.querySelector('#member-search-page').addEventListener('input', (event) => {
    state.search = event.target.value.trim();
    renderList();
  });
  container.querySelector('#member-status-filter').addEventListener('change', (event) => {
    state.statusFilter = event.target.value;
    renderList();
  });
  container.querySelector('#member-due-filter').addEventListener('change', (event) => {
    state.dueFilter = event.target.value;
    renderList();
  });

  async function refresh() {
    const [freshMembers, freshMemberships] = await Promise.all([
      fetchAllMembers(gym.id),
      fetchLatestMembershipsForGym(gym.id),
    ]);
    state.members = freshMembers.map((m) => ({ ...m, membership: freshMemberships.get(m.id) ?? null }));
    renderList();
  }

  async function openMemberModal(member, mode) {
    if (mode === 'view') {
      modal.open(memberViewMarkup(member), (body) => {
        body.querySelector('#member-switch-edit').addEventListener('click', () => openMemberModal(member, 'edit'));
      });
      return;
    }

    const [membership, plans] = await Promise.all([
      fetchLatestMembership(gym.id, member.id),
      fetchMembershipPlans(gym.id),
    ]);

    modal.open(memberFormMarkup(member, membership, plans), (body) => {
      wireMemberForm(body, gym, member, {
        onSaved: async () => {
          modal.close();
          await refresh();
        },
        onDeleted: async () => {
          modal.close();
          await refresh();
        },
        onCancel: modal.close,
      });
    });
  }

  container.querySelector('#member-new').addEventListener('click', () => {
    modal.open(memberCreateMarkup(), (body) => {
      wireCreateForm(body, gym, {
        onCreated: async (newMemberId) => {
          await refresh();
          const created = state.members.find((m) => m.id === newMemberId);
          if (created) openMemberModal(created, 'edit');
          else modal.close();
        },
        onCancel: modal.close,
      });
    });
  });

  renderList();
}

// ---- Tabla ----

function memberRowMarkup(m) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email;
  const planName = m.membership?.membership_plans?.name ?? 'Sin plan';
  const phoneDigits = (m.phone ?? '').replace(/\D/g, '');

  return `
    <tr>
      <td>${escapeHtml(m.member_number ?? '—')}</td>
      <td class="member-name-cell">
        ${m.photo_url ? `<img class="member-thumb" src="${escapeHtml(m.photo_url)}" alt="" />` : `<span class="member-thumb member-thumb-placeholder"></span>`}
        ${escapeHtml(fullName)}
      </td>
      <td><span class="status-badge status-${m.status}">${STATUS_LABELS[m.status] ?? m.status}</span></td>
      <td>${escapeHtml(planName)}</td>
      <td>${formatTimestamp(m.created_at)}</td>
      <td>${formatDateOnly(m.membership?.paid_at)}</td>
      <td>${formatDateOnly(m.membership?.expires_at)}</td>
      <td class="row-actions">
        <button type="button" class="icon-btn member-view" data-id="${m.id}" title="Ver detalle">${ICONS.eye}</button>
        <button type="button" class="icon-btn member-edit" data-id="${m.id}" title="Editar">${ICONS.pencil}</button>
        ${
          phoneDigits
            ? `<a class="icon-btn whatsapp-link" href="https://wa.me/${phoneDigits}" target="_blank" rel="noopener noreferrer" title="Abrir WhatsApp">${ICONS.whatsapp}</a>`
            : `<span class="icon-btn is-disabled" title="Sin teléfono registrado">${ICONS.whatsapp}</span>`
        }
      </td>
    </tr>
  `;
}

function sortValue(m, key) {
  switch (key) {
    case 'member_number':
      return m.member_number ?? '';
    case 'name':
      return `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim().toLowerCase() || m.email;
    case 'status':
      return m.status ?? '';
    case 'plan':
      return m.membership?.membership_plans?.name ?? '';
    case 'created_at':
      return m.created_at ?? '';
    case 'paid_at':
      return m.membership?.paid_at ?? '';
    case 'expires_at':
      return m.membership?.expires_at ?? '';
    default:
      return '';
  }
}

function matchesDueFilter(m, filter) {
  const expiresAt = m.membership?.expires_at;
  if (!expiresAt) return false;
  const today = localToday();
  switch (filter) {
    case 'alDia':
      return expiresAt >= today;
    case 'vencidos':
      return expiresAt < today;
    case 'vencenEstaSemana':
      return expiresAt >= today && expiresAt <= addDaysIso(today, 7);
    case 'vencieronUltimoMes':
      return expiresAt < today && expiresAt >= addDaysIso(today, -30);
    default:
      return true;
  }
}

function compareValues(a, b) {
  const na = Number(a);
  const nb = Number(b);
  if (a !== '' && b !== '' && !Number.isNaN(na) && !Number.isNaN(nb)) return na - nb;
  return String(a).localeCompare(String(b), 'es');
}

// ---- Vista de detalle (solo lectura) ----

function memberViewMarkup(m) {
  const fullName = [m.first_name, m.last_name].filter(Boolean).join(' ') || m.email;
  const membership = m.membership;

  return `
    <div class="member-detail">
      ${m.photo_url ? `<img class="member-detail-photo" src="${escapeHtml(m.photo_url)}" alt="" />` : `<div class="member-detail-photo member-thumb-placeholder"></div>`}
      <h3>${escapeHtml(fullName)}</h3>
      <p class="muted">${escapeHtml(m.email)}</p>
      <span class="status-badge status-${m.status}">${STATUS_LABELS[m.status] ?? m.status}</span>

      <dl class="detail-list">
        <dt>N° de socio</dt><dd>${escapeHtml(m.member_number ?? '—')}</dd>
        <dt>Teléfono</dt><dd>${escapeHtml(m.phone ?? '—')}</dd>
        <dt>Fecha de alta</dt><dd>${formatTimestamp(m.created_at)}</dd>
        <dt>Contacto de emergencia</dt><dd>${escapeHtml(m.emergency_contact_name ?? '—')}${m.emergency_contact_phone ? ` · ${escapeHtml(m.emergency_contact_phone)}` : ''}</dd>
        <dt>Obra social</dt><dd>${escapeHtml(m.health_insurance ?? '—')}</dd>
        <dt>Plan</dt><dd>${escapeHtml(membership?.membership_plans?.name ?? 'Sin plan')}</dd>
        <dt>Pagó</dt><dd>${formatDateOnly(membership?.paid_at)}</dd>
        <dt>Vence</dt><dd>${formatDateOnly(membership?.expires_at)}</dd>
      </dl>

      <button type="button" id="member-switch-edit" class="btn btn-primary">Editar</button>
    </div>
  `;
}

// ---- Alta rápida de socio ----

function memberCreateMarkup() {
  return `
    <h3>Agregar socio</h3>
    <p class="muted">Creá el acceso; después vas a poder cargar foto, cuota y el resto de los datos.</p>
    <form id="member-create-form" class="form">
      <div class="form-row">
        <label>
          Nombre
          <input type="text" name="first_name" required />
        </label>
        <label>
          Apellido
          <input type="text" name="last_name" required />
        </label>
      </div>
      <label>
        Email
        <input type="email" name="email" required />
      </label>
      <label>
        Teléfono
        <input type="tel" name="phone" />
      </label>
      <label>
        Contraseña temporal
        <input type="password" name="password" required minlength="6" />
      </label>
      <p class="form-error" id="member-create-error" hidden></p>
      <div class="form-row">
        <button type="submit" class="btn btn-primary">Crear socio</button>
        <button type="button" id="member-create-cancel" class="btn-link">Cancelar</button>
      </div>
    </form>
  `;
}

function wireCreateForm(panel, gym, { onCreated, onCancel }) {
  const form = panel.querySelector('#member-create-form');
  const errorEl = panel.querySelector('#member-create-error');
  panel.querySelector('#member-create-cancel').addEventListener('click', onCancel);

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      const { id } = await createMemberAccount({
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('first_name'),
        lastName: formData.get('last_name'),
        phone: formData.get('phone') || null,
      });
      await onCreated(id);
    } catch (err) {
      errorEl.textContent = err.message;
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });
}

// ---- Edición ----

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

    <div class="photo-editor">
      <img id="photo-preview" class="member-detail-photo" src="${member.photo_url ? escapeHtml(member.photo_url) : ''}" alt="" ${member.photo_url ? '' : 'hidden'} />
      ${member.photo_url ? '' : `<div id="photo-placeholder" class="member-detail-photo member-thumb-placeholder"></div>`}
      <label class="file-label">
        Foto (se recorta 1:1, 480×480)
        <input type="file" id="member-photo-input" accept="image/*" />
      </label>
      <div id="crop-wrap" class="crop-wrap" hidden>
        <div class="crop-image-wrap"><img id="crop-image" /></div>
        <div class="form-row">
          <button type="button" id="crop-confirm" class="btn btn-primary">Recortar y usar</button>
          <button type="button" id="crop-cancel" class="btn-link">Cancelar</button>
        </div>
      </div>
    </div>

    <form id="member-form" class="form">
      <input type="hidden" name="photo_url" value="${member.photo_url ? escapeHtml(member.photo_url) : ''}" />
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
      <div class="form-row">
        <label>
          Contacto de emergencia (nombre)
          <input type="text" name="emergency_contact_name" required value="${escapeHtml(member.emergency_contact_name ?? '')}" />
        </label>
        <label>
          Contacto de emergencia (teléfono)
          <input type="tel" name="emergency_contact_phone" required value="${escapeHtml(member.emergency_contact_phone ?? '')}" />
        </label>
      </div>
      <label>
        Obra social (opcional)
        <input type="text" name="health_insurance" value="${escapeHtml(member.health_insurance ?? '')}" />
      </label>
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
    ${membership ? `<p class="muted">Plan actual: ${escapeHtml(membership.membership_plans?.name ?? '—')} · pagó ${formatDateOnly(membership.paid_at)} · vence ${formatDateOnly(membership.expires_at)}</p>` : `<p class="muted">Sin cuota registrada.</p>`}
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
          <input type="date" name="paid_at" value="${localToday()}" />
        </label>
        <label>
          Vence
          <input type="date" name="expires_at" required value="${addMonthsIso(localToday(), 1)}" />
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
  wirePhotoEditor(panel, gym, member);

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
        emergency_contact_name: formData.get('emergency_contact_name') || null,
        emergency_contact_phone: formData.get('emergency_contact_phone') || null,
        health_insurance: formData.get('health_insurance') || null,
        photo_url: formData.get('photo_url') || null,
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
        start_date: localToday(),
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

function wirePhotoEditor(panel, gym, member) {
  const fileInput = panel.querySelector('#member-photo-input');
  const cropWrap = panel.querySelector('#crop-wrap');
  const cropImage = panel.querySelector('#crop-image');
  const preview = panel.querySelector('#photo-preview');
  const placeholder = panel.querySelector('#photo-placeholder');
  const hiddenPhoto = panel.querySelector('input[name="photo_url"]');
  let cropper = null;

  fileInput.addEventListener('change', () => {
    const file = fileInput.files[0];
    if (!file) return;
    cropImage.src = URL.createObjectURL(file);
    cropWrap.hidden = false;
    if (cropper) cropper.destroy();
    cropper = new Cropper(cropImage, { aspectRatio: 1, viewMode: 1, autoCropArea: 1, background: false });
  });

  panel.querySelector('#crop-cancel').addEventListener('click', () => {
    cropWrap.hidden = true;
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }
    fileInput.value = '';
  });

  panel.querySelector('#crop-confirm').addEventListener('click', () => {
    if (!cropper) return;
    const confirmBtn = panel.querySelector('#crop-confirm');
    confirmBtn.disabled = true;
    const canvas = cropper.getCroppedCanvas({ width: 480, height: 480 });
    canvas.toBlob(async (blob) => {
      try {
        const url = await uploadMemberPhoto(gym.id, member.id, blob);
        preview.src = url;
        preview.hidden = false;
        if (placeholder) placeholder.hidden = true;
        hiddenPhoto.value = url;
        cropWrap.hidden = true;
        cropper.destroy();
        cropper = null;
        fileInput.value = '';
      } catch (err) {
        alert('No pudimos subir la foto: ' + err.message);
      } finally {
        confirmBtn.disabled = false;
      }
    }, 'image/jpeg', 0.9);
  });
}

// ---- Utilidades ----

function addMonthsIso(iso, months) {
  const [y, m, d] = iso.split('-').map(Number);
  const date = new Date(y, m - 1 + months, d);
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${mm}-${dd}`;
}

function formatDateOnly(value) {
  if (!value) return '—';
  const [y, m, d] = value.split('-');
  return `${d}/${m}/${y}`;
}

function formatTimestamp(value) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('es-AR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
