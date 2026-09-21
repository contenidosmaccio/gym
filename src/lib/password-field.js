export function passwordFieldMarkup({ label, name, autocomplete, minlength }) {
  return `
    <label>
      ${label}
      <div class="password-field">
        <input
          type="password"
          name="${name}"
          required
          autocomplete="${autocomplete}"
          ${minlength ? `minlength="${minlength}"` : ''}
        />
        <button type="button" class="password-toggle" data-for="${name}" aria-label="Mostrar contraseña">👁</button>
      </div>
    </label>
  `;
}

export function wirePasswordToggles(container) {
  container.querySelectorAll('.password-toggle').forEach((btn) => {
    btn.addEventListener('click', () => {
      const input = btn.previousElementSibling;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '👁' : '🙈';
      btn.setAttribute('aria-label', showing ? 'Mostrar contraseña' : 'Ocultar contraseña');
    });
  });
}
