CREATE TABLE IF NOT EXISTS agent_runs(
 id UUID PRIMARY KEY,
 company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
 employee_id UUID NOT NULL REFERENCES employees(id) ON DELETE CASCADE,
 agent_id UUID NOT NULL REFERENCES agents(id) ON DELETE CASCADE,
 conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
 message TEXT NOT NULL,
 status TEXT NOT NULL DEFAULT 'RUNNING',
 current_step INTEGER NOT NULL DEFAULT 0,
 max_steps INTEGER NOT NULL DEFAULT 5,
 results JSONB NOT NULL DEFAULT '[]',
 waiting_execution_id UUID REFERENCES tool_executions(id) ON DELETE SET NULL,
 waiting_approval_id UUID REFERENCES approvals(id) ON DELETE SET NULL,
 created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
 completed_at TIMESTAMPTZ
);
CREATE INDEX IF NOT EXISTS agent_runs_company_idx ON agent_runs(company_id,created_at DESC);
CREATE INDEX IF NOT EXISTS agent_runs_waiting_execution_idx ON agent_runs(waiting_execution_id) WHERE waiting_execution_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS agent_runs_employee_idx ON agent_runs(employee_id,created_at DESC);
