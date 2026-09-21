import { signIn } from '../lib/auth.js';
import { passwordFieldMarkup, wirePasswordToggles } from '../lib/password-field.js';

export function renderLogin(container, gym, { onSuccess, onGoRegister, initialError }) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        ${logoMarkup(gym)}
        <h1 class="gym-name">${escapeHtml(gym.name)}</h1>
        <form id="login-form" class="form">
          <label>
            Email
            <input type="email" name="email" required autocomplete="email" />
          </label>
          ${passwordFieldMarkup({ label: 'Contraseña', name: 'password', autocomplete: 'current-password' })}
          <p class="form-error" id="login-error" ${initialError ? '' : 'hidden'}>${escapeHtml(translateAuthError(initialError ?? ''))}</p>
          <button type="submit" class="btn btn-primary">Ingresar</button>
        </form>
        <p class="auth-alt">
          ¿Todavía no tenés cuenta?
          <button type="button" id="go-register" class="btn-link">Registrarme</button>
        </p>
      </div>
    </div>
  `;

  wirePasswordToggles(container);

  const form = container.querySelector('#login-form');
  const errorEl = container.querySelector('#login-error');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    const formData = new FormData(form);
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await signIn({ email: formData.get('email'), password: formData.get('password') });
      onSuccess();
    } catch (err) {
      errorEl.textContent = translateAuthError(err.message);
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  container.querySelector('#go-register').addEventListener('click', onGoRegister);
}

function translateAuthError(message) {
  if (message.includes('Invalid login credentials')) return 'Email o contraseña incorrectos.';
  if (message.includes('Email link is invalid or has expired')) {
    return 'Ese link de confirmación ya fue usado o expiró. Si todavía no pudiste ingresar, registrate de nuevo con el mismo email para recibir uno nuevo.';
  }
  return message;
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
