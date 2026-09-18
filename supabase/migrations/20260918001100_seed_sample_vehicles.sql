-- ATL Work Cars — 0011: load the six sample cars from the old src/data/vehicles.ts
-- Codes awc-101 … awc-106 are kept so shared links keep working. All are sample
-- listings: the site shows only the "Sample listing" badge, no odometer or MPG.
-- Prices, odometer and fuel economy stay NULL — never invented.
-- Old availability → new status: available/limited/reserved/rented → available
-- (a car cannot be "rented" without a real renter); maintenance → in_repair.

insert into public.vehicles
  (code, year, make, model, trim, body_type, seats, rideshare_note, status, is_featured, is_published, is_sample)
values
  ('awc-101', 2020, 'Toyota', 'Camry',         'LE', 'sedan',     5, '4 doors, seats 5, model year 2020.', 'available', true,  true, true),
  ('awc-102', 2021, 'Toyota', 'Prius',         null, 'hybrid',    5, '4 doors, seats 5, model year 2021.', 'available', true,  true, true),
  ('awc-103', 2019, 'Nissan', 'Sentra',        'S',  'compact',   5, '4 doors, seats 5, model year 2019.', 'available', true,  true, true),
  ('awc-104', 2019, 'Honda',  'Fit',           null, 'hatchback', 5, '4 doors, seats 5, model year 2019.', 'available', false, true, true),
  ('awc-105', 2020, 'Toyota', 'RAV4',          'LE', 'suv',       5, '4 doors, seats 5, model year 2020.', 'available', false, true, true),
  ('awc-106', 2018, 'Dodge',  'Grand Caravan', 'SE', 'minivan',   7, '4 doors plus sliding rear doors, seats 7, model year 2018.', 'in_repair', false, true, true)
on conflict (code) do nothing;
