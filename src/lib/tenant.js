import { supabase } from './supabase.js';

const PLATFORM_DOMAIN = import.meta.env.VITE_PLATFORM_DOMAIN;
const DEV_GYM_SLUG = import.meta.env.VITE_DEV_GYM_SLUG || 'forge';

// Resuelve qué gimnasio corresponde según el dominio/subdominio actual.
// ?gym=slug fuerza un gimnasio puntual (útil en local, y también en
// dominios "técnicos" sin branding propio todavía, como *.workers.dev o
// *.pages.dev, mientras no haya dominios reales conectados).
function resolveLookup() {
  const hostname = window.location.hostname;
  const params = new URLSearchParams(window.location.search);
  const forcedSlug = params.get('gym');

  if (forcedSlug) {
    localStorage.setItem('dev_gym_slug', forcedSlug);
    return { column: 'slug', value: forcedSlug };
  }

  const isTechnicalPreviewDomain =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname.endsWith('.workers.dev') ||
    hostname.endsWith('.pages.dev');

  if (isTechnicalPreviewDomain) {
    return { column: 'slug', value: localStorage.getItem('dev_gym_slug') || DEV_GYM_SLUG };
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
