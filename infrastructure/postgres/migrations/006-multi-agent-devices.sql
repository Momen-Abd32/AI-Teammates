-- Allow multiple specialized agents per employee.
ALTER TABLE agents DROP CONSTRAINT IF EXISTS agents_employee_id_key;
CREATE INDEX IF NOT EXISTS agents_employee_idx ON agents(employee_id,created_at DESC);

CREATE TABLE IF NOT EXISTS devices(
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'OFFLINE' CHECK(status IN ('ONLINE','OFFLINE','REVOKED')),
  token_hash TEXT NOT NULL UNIQUE,
  capabilities JSONB NOT NULL DEFAULT '[]',
  last_seen_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS device_agent_bindings(
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  permissions JSONB NOT NULL DEFAULT '[]',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY(device_id,agent_id)
);

CREATE TABLE IF NOT EXISTS device_commands(
  id UUID PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  device_id UUID NOT NULL REFERENCES devices(id) ON DELETE CASCADE,
  agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  arguments JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'QUEUED',
  result JSONB,
  approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS devices_employee_idx ON devices(employee_id,created_at DESC);
CREATE INDEX IF NOT EXISTS devices_company_idx ON devices(company_id,status);
CREATE INDEX IF NOT EXISTS device_commands_device_idx ON device_commands(device_id,created_at DESC);
CREATE INDEX IF NOT EXISTS device_commands_agent_idx ON device_commands(agent_id,created_at DESC);
