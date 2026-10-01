-- Production hardening for device command execution.
-- Keep command lookup fast and prevent terminal device results from being overwritten after completion.
CREATE INDEX IF NOT EXISTS device_commands_device_status_idx
  ON device_commands(device_id, status, created_at DESC);

CREATE INDEX IF NOT EXISTS device_commands_agent_idx
  ON device_commands(agent_id, created_at DESC);
