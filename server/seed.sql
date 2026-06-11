-- Seed initial employees
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

-- Seed default coverage requirements
INSERT INTO requirements (role, day_shifts, night_shifts) VALUES
  ('MED', 1, 1),
  ('AS', 3, 3)
ON CONFLICT (role) DO NOTHING;
