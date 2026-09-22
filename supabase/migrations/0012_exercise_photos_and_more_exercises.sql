-- Fotos (placeholder, reemplazables luego por el admin) para los 10
-- ejercicios existentes, y 30 ejercicios nuevos con foto para llegar a 40.

update exercises set image_url = 'https://picsum.photos/seed/' || slug || '/480/320'
from (values
  ('Press banca', 'press-banca'),
  ('Press militar', 'press-militar'),
  ('Dominadas', 'dominadas'),
  ('Sentadilla', 'sentadilla'),
  ('Peso muerto', 'peso-muerto'),
  ('Curl de bíceps', 'curl-biceps'),
  ('Fondos en paralelas', 'fondos-paralelas'),
  ('Plancha abdominal', 'plancha-abdominal'),
  ('Remo con barra', 'remo-barra'),
  ('Burpees', 'burpees')
) as s(name, slug)
where exercises.name = s.name and exercises.gym_id = (select id from gyms where slug = 'forge');

with forge as (select id as gym_id from gyms where slug = 'forge')
insert into exercises (gym_id, name, muscle_group, description, image_url)
select forge.gym_id, e.name, e.muscle_group, e.description,
  'https://picsum.photos/seed/' || e.slug || '/480/320'
from forge, (values
  ('Aperturas con mancuernas', 'aperturas-mancuernas', 'Pecho', 'Apertura en banco plano, foco en pectoral.'),
  ('Press inclinado con barra', 'press-inclinado', 'Pecho', 'Press en banco inclinado, pectoral superior.'),
  ('Flexiones de brazos', 'flexiones', 'Pecho', 'Push-ups clásicas, peso corporal.'),
  ('Jalón al pecho', 'jalon-pecho', 'Espalda', 'Tracción vertical en polea alta.'),
  ('Remo con mancuerna a un brazo', 'remo-mancuerna', 'Espalda', 'Apoyo en banco, tracción unilateral.'),
  ('Pull-over con mancuerna', 'pull-over', 'Espalda', 'Extensión de brazos sobre el pecho, dorsal y serrato.'),
  ('Curl martillo', 'curl-martillo', 'Bíceps', 'Curl con agarre neutro.'),
  ('Curl concentrado', 'curl-concentrado', 'Bíceps', 'Curl unilateral apoyado en el muslo.'),
  ('Extensión de tríceps en polea', 'extension-triceps-polea', 'Tríceps', 'Polea alta, codos fijos al costado.'),
  ('Patada de tríceps', 'patada-triceps', 'Tríceps', 'Extensión de codo con mancuerna, torso inclinado.'),
  ('Elevaciones laterales', 'elevaciones-laterales', 'Hombros', 'Abducción de hombro con mancuernas.'),
  ('Elevaciones frontales', 'elevaciones-frontales', 'Hombros', 'Flexión de hombro con mancuernas o barra.'),
  ('Face pull', 'face-pull', 'Hombros', 'Tracción a la cara en polea, deltoides posterior.'),
  ('Prensa de piernas', 'prensa-piernas', 'Piernas', 'Empuje de piernas en máquina inclinada.'),
  ('Zancadas con mancuernas', 'zancadas', 'Piernas', 'Paso alterno con mancuernas en cada mano.'),
  ('Extensión de cuádriceps', 'extension-cuadriceps', 'Piernas', 'Máquina de extensión, aislado de cuádriceps.'),
  ('Curl femoral', 'curl-femoral', 'Piernas', 'Máquina de curl, aislado de isquiotibiales.'),
  ('Hip thrust', 'hip-thrust', 'Glúteos', 'Extensión de cadera con barra, espalda apoyada en banco.'),
  ('Patada de glúteo en polea', 'patada-gluteo', 'Glúteos', 'Extensión de cadera en polea baja.'),
  ('Crunch abdominal', 'crunch', 'Abdominales', 'Flexión de tronco clásica.'),
  ('Elevación de piernas colgado', 'elevacion-piernas', 'Abdominales', 'Colgado de barra, elevación de piernas o rodillas.'),
  ('Russian twist', 'russian-twist', 'Abdominales', 'Rotación de tronco sentado, con o sin peso.'),
  ('Cinta de correr', 'cinta', 'Cardio', 'Caminata o carrera continua o por intervalos.'),
  ('Bicicleta fija', 'bicicleta', 'Cardio', 'Pedaleo continuo o por intervalos.'),
  ('Remo (ergómetro)', 'ergometro', 'Cardio', 'Remo en máquina, cuerpo completo.'),
  ('Estiramiento de cadera 90/90', 'cadera-90-90', 'Movilidad', 'Movilidad de rotación de cadera sentado.'),
  ('Movilidad de hombros con banda', 'movilidad-hombros', 'Movilidad', 'Rotaciones con banda elástica.'),
  ('Kettlebell swing', 'kb-swing', 'Crossfit', 'Balanceo de kettlebell, cadena posterior y potencia.'),
  ('Box jump', 'box-jump', 'Crossfit', 'Salto a cajón, potencia de tren inferior.'),
  ('Wall ball', 'wall-ball', 'Crossfit', 'Sentadilla + lanzamiento de balón medicinal a la pared.')
) as e(name, slug, muscle_group, description);
