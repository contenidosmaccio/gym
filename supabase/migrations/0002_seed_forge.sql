-- Alta del primer gimnasio: Forge Fitness Club.
-- Paleta según la especificación: negro/gris muy oscuro, blanco, naranja
-- Forge, con rojo como acento secundario puntual.

insert into gyms (
  slug, domain, name,
  primary_color, secondary_color, background_color, contrast_color,
  description
) values (
  'forge',
  null, -- se completa cuando esté listo forgefitness.com.ar
  'Forge Fitness Club',
  '#ff6a00', -- naranja Forge
  '#e53935', -- rojo, acento puntual
  '#0a0a0a', -- negro / gris muy oscuro
  '#ffffff', -- blanco
  'Entrená fuerte. Forge Fitness Club.'
)
on conflict (slug) do nothing;
