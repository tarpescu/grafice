PRAGMA foreign_keys = ON;

-- 1. Create Tables
CREATE TABLE IF NOT EXISTS employees (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL, -- 'MED' or 'AS'
  contract_hours INTEGER NOT NULL DEFAULT 168,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shifts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 0-11
  day INTEGER NOT NULL,   -- 1-31
  shift_type TEXT NOT NULL, -- 'Z', 'N', '8', 'CO', 'CIC', '-'
  UNIQUE (employee_id, year, month, day)
);

CREATE TABLE IF NOT EXISTS requirements (
  role TEXT PRIMARY KEY, -- 'MED' or 'AS'
  day_shifts INTEGER NOT NULL DEFAULT 1,
  night_shifts INTEGER NOT NULL DEFAULT 1
);

CREATE TABLE IF NOT EXISTS vacation_planning (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  job_title TEXT DEFAULT '',
  seniority_total TEXT DEFAULT '',
  seniority_unit TEXT DEFAULT '',
  vacation_days_allowed TEXT DEFAULT '',
  jan TEXT DEFAULT '',
  feb TEXT DEFAULT '',
  mar TEXT DEFAULT '',
  apr TEXT DEFAULT '',
  may TEXT DEFAULT '',
  jun TEXT DEFAULT '',
  jul TEXT DEFAULT '',
  aug TEXT DEFAULT '',
  sep TEXT DEFAULT '',
  oct TEXT DEFAULT '',
  nov TEXT DEFAULT '',
  dec TEXT DEFAULT '',
  UNIQUE (employee_id, year)
);

-- 2. Seed Initial Employees
INSERT INTO employees (name, role, contract_hours) VALUES
  ('APOSTOL FLORENTINA', 'AS', 128),
  ('ARSENIE TATIANA', 'AS', 120),
  ('BOLOHAN CARMEN', 'AS', 168),
  ('BUTA VALENTINA', 'AS', 88),
  ('IRINA DANIELA', 'AS', 104),
  ('NISTOR LĂCRĂMIOARA', 'AS', 112),
  ('TÂRPESCU DANA', 'AS', 128),
  ('ȘERBAN MONICA', 'AS', 88),
  ('VASILIU FLORIN', 'AS', 128),
  ('INSURĂȚELU CRISTINA', 'AS', 168),
  ('APOSTOL ELENA', 'AS', 168),
  ('CRIȘU TUDORIȚA', 'AS', 168),
  ('GRIGORE GABRIELA', 'AS', 168),
  ('IRIMIA MIHAELA', 'AS', 168),
  ('ELEFTERIU MIHAELA', 'AS', 168),
  ('CLIMINTE LUMINIȚA', 'AS', 128),
  ('GRECU MIRELA', 'AS', 168),
  ('DAMIAN ANA MARIA', 'AS', 140),
  ('UNGUREANU SERGIU', 'MED', 140)
ON CONFLICT (name) DO NOTHING;

-- 3. Seed Default Coverage Requirements
INSERT INTO requirements (role, day_shifts, night_shifts) VALUES
  ('MED', 1, 1),
  ('AS', 3, 3)
ON CONFLICT (role) DO NOTHING;
