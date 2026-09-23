import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";

const DEFAULT_AGENT_PERMISSIONS = [
  "agent.chat",
  "memory.read",
  "memory.write",
  "task.read",
  "task.create",
  "project.read",
  "agent.collaborate",
];

@Injectable()
export class OrganizationRepository {
  constructor(private db:DatabaseService) {}

  async createCompany(name:string) {
    const r = await this.db.query(
      "INSERT INTO companies(id,name) VALUES(gen_random_uuid(),$1) RETURNING id,name",
      [name],
    );
    return r.rows[0];
  }

  async createEmployee(companyId:string,name:string,email:string,role:string) {
    const r = await this.db.query(
      "INSERT INTO employees(id,company_id,name,email,role) VALUES(gen_random_uuid(),$1,$2,$3,$4) RETURNING id,company_id AS \"companyId\",name,email,role",
      [companyId,name,email,role],
    );
    return r.rows[0];
  }

  async createAgent(companyId:string,employeeId:string,role:string,instructions="") {
    const r = await this.db.query(
      `INSERT INTO agents(id,company_id,employee_id,role,system_instructions,permissions)
       VALUES(gen_random_uuid(),$1,$2,$3,$4,$5::jsonb)
       ON CONFLICT(employee_id) DO UPDATE
       SET role=EXCLUDED.role,system_instructions=EXCLUDED.system_instructions
       RETURNING id,company_id AS "companyId",employee_id AS "employeeId",role,system_instructions AS "systemInstructions",permissions`,
      [companyId,employeeId,role,instructions,JSON.stringify(DEFAULT_AGENT_PERMISSIONS)],
    );
    return r.rows[0];
  }

  async employees(companyId:string) {
    const r = await this.db.query(
      "SELECT id,company_id AS \"companyId\",name,email,role FROM employees WHERE company_id=$1 ORDER BY created_at",
      [companyId],
    );
    return r.rows;
  }

  async agents(companyId:string) {
    const r = await this.db.query(
      "SELECT id,company_id AS \"companyId\",employee_id AS \"employeeId\",role,system_instructions AS \"systemInstructions\",permissions FROM agents WHERE company_id=$1 ORDER BY created_at",
      [companyId],
    );
    return r.rows;
  }
}
