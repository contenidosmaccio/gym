// Paleta categórica validada (accesible para daltonismo/contraste), pasos
// para superficie oscura. "Sin plan" usa el gris neutro de estado, no una
// de las 8 tonalidades, para no competir con las categorías reales.
const CATEGORICAL_DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9', '#e66767'];
const NEUTRAL = '#6b7280';

export function colorForSlice(label, index) {
  if (label === 'Sin plan') return NEUTRAL;
  return CATEGORICAL_DARK[index % CATEGORICAL_DARK.length];
}

export function donutChartMarkup(distribution, { size = 200, strokeWidth = 28 } = {}) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0);
  if (total === 0) {
    return `<p class="muted">Sin datos todavía.</p>`;
  }

  const r = (size - strokeWidth) / 2;
  const cx = size / 2;
  const cy = size / 2;
  const gapDeg = distribution.length > 1 ? 3 : 0;

  let angle = -90;
  const paths = distribution
    .map((d, i) => {
      const sweep = (d.count / total) * 360;
      const start = angle + gapDeg / 2;
      const end = angle + sweep - gapDeg / 2;
      angle += sweep;
      if (end <= start) return '';
      const color = colorForSlice(d.label, i);
      const pct = Math.round((d.count / total) * 100);
      return `<path d="${describeArc(cx, cy, r, start, end)}" stroke="${color}" stroke-width="${strokeWidth}" fill="none" stroke-linecap="butt"><title>${escapeHtml(d.label)}: ${d.count} (${pct}%)</title></path>`;
    })
    .join('');

  return `
    <svg viewBox="0 0 ${size} ${size}" width="${size}" height="${size}" class="donut-chart" role="img" aria-label="Distribución de socios por plan">
      ${paths}
      <text x="${cx}" y="${cy - 4}" text-anchor="middle" class="donut-total">${total}</text>
      <text x="${cx}" y="${cy + 16}" text-anchor="middle" class="donut-total-label">socios</text>
    </svg>
  `;
}

export function donutLegendMarkup(distribution) {
  const total = distribution.reduce((sum, d) => sum + d.count, 0) || 1;
  return `
    <ul class="donut-legend">
      ${distribution
        .map((d, i) => {
          const pct = Math.round((d.count / total) * 100);
          return `
          <li>
            <span class="legend-dot" style="background:${colorForSlice(d.label, i)}"></span>
            <span class="legend-label">${escapeHtml(d.label)}</span>
            <span class="legend-value">${d.count} · ${pct}%</span>
          </li>`;
        })
        .join('')}
    </ul>
  `;
}

function polarToCartesian(cx, cy, r, angleDeg) {
  const rad = (angleDeg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function describeArc(cx, cy, r, startAngle, endAngle) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = endAngle - startAngle <= 180 ? 0 : 1;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 1 ${end.x} ${end.y}`;
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str ?? '';
  return div.innerHTML;
}
