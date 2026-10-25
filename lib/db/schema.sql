CREATE TABLE IF NOT EXISTS employees (
  employee_no TEXT PRIMARY KEY,
  name        TEXT NOT NULL,
  department  TEXT,
  designation TEXT
);

CREATE TABLE IF NOT EXISTS salaries (
  employee_no TEXT NOT NULL,
  year        INT  NOT NULL,
  month       INT  NOT NULL CHECK (month BETWEEN 1 AND 12),
  amount      NUMERIC(12,2) NOT NULL,
  PRIMARY KEY (employee_no, year, month)
);

CREATE TABLE IF NOT EXISTS projects (
  ref_code    TEXT PRIMARY KEY,
  name        TEXT,
  price       NUMERIC(12,2),
  sales_year  INT,
  sales_month INT,
  category    TEXT,
  status      TEXT
);

CREATE TABLE IF NOT EXISTS timesheet_entries (
  id           SERIAL PRIMARY KEY,
  year         INT NOT NULL,
  month        INT NOT NULL CHECK (month BETWEEN 1 AND 12),
  employee_no  TEXT NOT NULL,
  expense_type TEXT,
  department   TEXT,
  category     TEXT NOT NULL,
  ref_code     TEXT NOT NULL,
  task_name    TEXT,
  company      TEXT,
  description  TEXT,
  hours        NUMERIC(8,2) NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_ts_period ON timesheet_entries (year, month);
CREATE INDEX IF NOT EXISTS idx_ts_ref ON timesheet_entries (ref_code);

CREATE TABLE IF NOT EXISTS settings (
  key   TEXT PRIMARY KEY,
  value JSONB NOT NULL
);