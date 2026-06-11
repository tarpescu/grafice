CREATE TABLE IF NOT EXISTS employees (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) UNIQUE NOT NULL,
  role VARCHAR(10) NOT NULL, -- 'MED' or 'AS'
  contract_hours INTEGER NOT NULL DEFAULT 168,
  active BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS shifts (
  id SERIAL PRIMARY KEY,
  employee_id INTEGER REFERENCES employees(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  month INTEGER NOT NULL, -- 0-11
  day INTEGER NOT NULL,   -- 1-31
  shift_type VARCHAR(10) NOT NULL, -- 'Z', 'N', '8', 'CO', 'CIC', '-'
  UNIQUE (employee_id, year, month, day)
);

CREATE TABLE IF NOT EXISTS requirements (
  role VARCHAR(10) PRIMARY KEY, -- 'MED' or 'AS'
  day_shifts INTEGER NOT NULL DEFAULT 1,
  night_shifts INTEGER NOT NULL DEFAULT 1
);
