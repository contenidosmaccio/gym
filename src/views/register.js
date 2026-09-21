import { signUp } from '../lib/auth.js';
import { passwordFieldMarkup, wirePasswordToggles } from '../lib/password-field.js';

export function renderRegister(container, gym, { onSuccess, onGoLogin }) {
  container.innerHTML = `
    <div class="auth-screen">
      <div class="auth-card">
        ${logoMarkup(gym)}
        <h1 class="gym-name">${escapeHtml(gym.name)}</h1>
        <p class="auth-subtitle">Creá tu cuenta de socio</p>
        <form id="register-form" class="form">
          <label>
            Nombre
            <input type="text" name="firstName" required autocomplete="given-name" />
          </label>
          <label>
            Apellido
            <input type="text" name="lastName" required autocomplete="family-name" />
          </label>
          <label>
            Email
            <input type="email" name="email" required autocomplete="email" />
          </label>
          ${passwordFieldMarkup({ label: 'Contraseña', name: 'password', autocomplete: 'new-password', minlength: 6 })}
          ${passwordFieldMarkup({ label: 'Confirmar contraseña', name: 'passwordConfirm', autocomplete: 'new-password', minlength: 6 })}
          <p class="form-error" id="register-error" hidden></p>
          <p class="form-success" id="register-success" hidden></p>
          <button type="submit" class="btn btn-primary">Registrarme</button>
        </form>
        <p class="auth-alt">
          ¿Ya tenés cuenta?
          <button type="button" id="go-login" class="btn-link">Ingresar</button>
        </p>
      </div>
    </div>
  `;

  wirePasswordToggles(container);

  const form = container.querySelector('#register-form');
  const errorEl = container.querySelector('#register-error');
  const successEl = container.querySelector('#register-success');

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorEl.hidden = true;
    successEl.hidden = true;
    const formData = new FormData(form);

    if (formData.get('password') !== formData.get('passwordConfirm')) {
      errorEl.textContent = 'Las contraseñas no coinciden.';
      errorEl.hidden = false;
      return;
    }

    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    try {
      await signUp({
        email: formData.get('email'),
        password: formData.get('password'),
        firstName: formData.get('firstName'),
        lastName: formData.get('lastName'),
        gymId: gym.id,
      });
      successEl.textContent =
        'Cuenta creada. Un administrador del gimnasio va a validar tu registro antes de que puedas ingresar.';
      successEl.hidden = false;
      form.reset();
      setTimeout(onSuccess, 2500);
    } catch (err) {
      errorEl.textContent = translateAuthError(err.message);
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
    }
  });

  container.querySelector('#go-login').addEventListener('click', onGoLogin);
}

function translateAuthError(message) {
  if (message.includes('already registered')) return 'Ese email ya tiene una cuenta creada.';
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
