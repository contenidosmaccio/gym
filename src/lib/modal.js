export function modalShellMarkup() {
  return `
    <div class="modal-overlay">
      <div class="modal card">
        <button type="button" class="modal-close" aria-label="Cerrar">✕</button>
        <div class="modal-body"></div>
      </div>
    </div>
  `;
}

export function initModal(container) {
  const overlay = container.querySelector('.modal-overlay');
  const modalBody = container.querySelector('.modal-body');

  function close() {
    overlay.classList.remove('is-open');
  }

  function open(html, wire) {
    modalBody.innerHTML = html;
    if (wire) wire(modalBody, close);
    overlay.classList.add('is-open');
  }

  overlay.addEventListener('click', (event) => {
    if (event.target === overlay) close();
  });
  container.querySelector('.modal-close').addEventListener('click', close);
  document.addEventListener('keydown', function escHandler(event) {
    if (event.key === 'Escape') close();
    if (!document.body.contains(overlay)) document.removeEventListener('keydown', escHandler);
  });

  return { open, close };
}
