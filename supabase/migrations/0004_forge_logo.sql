-- Logo de Forge Fitness Club, subido a gym-assets/<gym_id>/logo.jpg.
update gyms
set
  logo_url = 'https://iqphcmadnegripefunxy.supabase.co/storage/v1/object/public/gym-assets/f09271e1-91e4-40f5-a2fc-b3ffc790e6cc/logo.jpg',
  favicon_url = 'https://iqphcmadnegripefunxy.supabase.co/storage/v1/object/public/gym-assets/f09271e1-91e4-40f5-a2fc-b3ffc790e6cc/logo.jpg'
where slug = 'forge';
