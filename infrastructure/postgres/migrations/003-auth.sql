ALTER TABLE employees ADD COLUMN IF NOT EXISTS password_hash TEXT;
CREATE INDEX IF NOT EXISTS employees_email_idx ON employees(lower(email));