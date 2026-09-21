import { signOut } from '../lib/auth.js';
import { renderSchedule } from './schedule.js';
import { renderExercises } from './exercises.js';

const ROLE_LABELS = {
  admin: 'Administrador',
  profe: 'Profesor',
  socio: 'Socio',
};

const TABS = [
  { id: 'home', label: 'Inicio' },
  { id: 'schedule', label: 'Horarios' },
  { id: 'exercises', label: 'Ejercicios' },
];

export function renderDashboard(container, gym, profile, { onSignOut }) {
  if (profile.status === 'pending') {
    renderPending(container, gym, onSignOut);
    return;
  }

  container.innerHTML = `
    <div class="app-shell">
      <header class="app-header">
        <span class="app-header-brand">
          ${headerLogoMarkup(gym)}
          <span class="gym-name">${escapeHtml(gym.name)}</span>
        </span>
        <button type="button" id="logout" class="btn-link">Cerrar sesión</button>
      </header>
      <nav class="app-tabs">
        ${TABS.map((tab) => `<button type="button" class="app-tab" data-tab="${tab.id}">${tab.label}</button>`).join('')}
      </nav>
      <main class="app-main" id="app-tab-content"></main>
    </div>
  `;

  container.querySelector('#logout').addEventListener('click', async () => {
    await signOut();
    onSignOut();
  });

  const tabButtons = [...container.querySelectorAll('.app-tab')];
  const content = container.querySelector('#app-tab-content');

  function selectTab(tabId) {
    tabButtons.forEach((btn) => btn.classList.toggle('is-active', btn.dataset.tab === tabId));
    if (tabId === 'schedule') {
      renderSchedule(content, gym, profile);
    } else if (tabId === 'exercises') {
      renderExercises(content, gym, profile);
    } else {
      renderHome(content, profile);
    }
  }

  tabButtons.forEach((btn) => btn.addEventListener('click', () => selectTab(btn.dataset.tab)));
  selectTab('home');
}

function renderHome(container, profile) {
  container.innerHTML = `
    <h2>Hola, ${escapeHtml(profile.first_name || profile.email)} 👋</h2>
    <p class="role-badge">${ROLE_LABELS[profile.role] ?? profile.role}</p>
    <div class="card">
      <p>
        Esta es la base de la plataforma: multi-gimnasio, roles y branding
        ya están funcionando. El resto de los módulos (rutinas, cuotas, etc.)
        se van a ir agregando por etapas.
      </p>
    </div>
  `;
}

function renderPending(container, gym, onSignOut) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        ${logoMarkup(gym)}
        <h1 class="gym-name">${escapeHtml(gym.name)}</h1>
        <p>Tu cuenta está creada, pero todavía falta que el gimnasio la valide.</p>
        <p>Cuando te habiliten, vas a poder ingresar con tu email y contraseña.</p>
        <button type="button" id="logout" class="btn btn-primary">Cerrar sesión</button>
      </div>
    </div>
  `;
  container.querySelector('#logout').addEventListener('click', async () => {
    await signOut();
    onSignOut();
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

function logoMarkup(gym) {
  if (!gym.logo_url) return '';
  return `<img class="auth-logo" src="${escapeHtml(gym.logo_url)}" alt="${escapeHtml(gym.name)}" />`;
}

function headerLogoMarkup(gym) {
  if (!gym.logo_url) return '';
  return `<img class="header-logo" src="${escapeHtml(gym.logo_url)}" alt="${escapeHtml(gym.name)}" />`;
}
