with forge as (select id as gym_id from gyms where slug = 'forge')
insert into exercises (gym_id, name, muscle_group, description)
select forge.gym_id, e.name, e.muscle_group, e.description
from forge, (values
  ('Press banca', 'Pecho', 'Press horizontal con barra.'),
  ('Press militar', 'Hombros', 'Press de hombros parado o sentado, con barra o mancuernas.'),
  ('Dominadas', 'Espalda', 'Tracción vertical en barra, agarre pronado o supino.'),
  ('Sentadilla', 'Piernas', 'Sentadilla con barra en espalda.'),
  ('Peso muerto', 'Piernas', 'Levantamiento con barra desde el piso, cadena posterior.'),
  ('Curl de bíceps', 'Bíceps', 'Curl con barra o mancuernas.'),
  ('Fondos en paralelas', 'Tríceps', 'Extensión de tríceps en paralelas.'),
  ('Plancha abdominal', 'Abdominales', 'Isométrico de core, mantener alineación de cadera.'),
  ('Remo con barra', 'Espalda', 'Tracción horizontal con barra, torso inclinado.'),
  ('Burpees', 'Crossfit', 'Movimiento completo de cuerpo, sentadilla + plancha + salto.')
) as e(name, muscle_group, description);
