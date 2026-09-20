import { supabase } from './supabase.js';
import { PLATFORM_DOMAIN, DEV_GYM_SLUG } from '../../config.js';

// Resuelve qué gimnasio corresponde según el dominio/subdominio actual.
// En local (sin dominio real), usa ?gym=slug o el último elegido, con
// DEV_GYM_SLUG como default.
function resolveLookup() {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const forcedSlug = params.get('gym');

  if (forcedSlug) localStorage.setItem('dev_gym_slug', forcedSlug);

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return { column: 'slug', value: forcedSlug || localStorage.getItem('dev_gym_slug') || DEV_GYM_SLUG };
  }

  if (PLATFORM_DOMAIN && hostname.endsWith(`.${PLATFORM_DOMAIN}`)) {
    const slug = hostname.slice(0, hostname.length - PLATFORM_DOMAIN.length - 1);
    return { column: 'slug', value: slug };
  }

  return { column: 'domain', value: hostname };
}

export async function loadTenant() {
  const { column, value } = resolveLookup();
  const { data, error } = await supabase.from('gyms').select('*').eq(column, value).maybeSingle();

  if (error) throw error;
  if (!data) {
    throw new Error(`No encontramos un gimnasio configurado para "${value}".`);
  }

  applyBranding(data);
  return data;
}

function applyBranding(gym) {
  const root = document.documentElement;
  root.style.setProperty('--color-primary', gym.primary_color);
  root.style.setProperty('--color-secondary', gym.secondary_color);
  root.style.setProperty('--color-background', gym.background_color);
  root.style.setProperty('--color-contrast', gym.contrast_color);

  document.title = gym.name;

  if (gym.favicon_url) {
    let link = document.querySelector('link[rel="icon"]');
    if (!link) {
      link = document.createElement('link');
      link.rel = 'icon';
      document.head.appendChild(link);
    }
    link.href = gym.favicon_url;
  }
}
