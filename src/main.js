import './styles/base.css';
import { loadTenant } from './lib/tenant.js';
import { getSession, getCurrentProfile } from './lib/auth.js';
import { renderLogin } from './views/login.js';
import { renderRegister } from './views/register.js';
import { renderDashboard } from './views/dashboard.js';

const app = document.querySelector('#app');

async function boot() {
  let gym;
  try {
    gym = await loadTenant();
  } catch (err) {
    renderTenantError(err);
    return;
  }

  const session = await getSession();
  if (session) {
    const profile = await getCurrentProfile();
    if (profile && profile.gym_id === gym.id) {
      showDashboard(gym, profile);
      return;
    }
  }

  showLogin(gym);
}

function showLogin(gym) {
  renderLogin(app, gym, {
    onSuccess: async () => {
      const profile = await getCurrentProfile();
      showDashboard(gym, profile);
    },
    onGoRegister: () => showRegister(gym),
  });
}

function showRegister(gym) {
  renderRegister(app, gym, {
    onSuccess: () => showLogin(gym),
    onGoLogin: () => showLogin(gym),
  });
}

function showDashboard(gym, profile) {
  renderDashboard(app, gym, profile, {
    onSignOut: () => showLogin(gym),
  });
}

function renderTenantError(err) {
  app.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        <h1>No pudimos cargar el gimnasio</h1>
        <p>${escapeHtml(err.message)}</p>
      </div>
    </div>
  `;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}

boot();
