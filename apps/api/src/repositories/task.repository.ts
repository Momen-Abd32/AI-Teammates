import { Injectable } from "@nestjs/common";
import { Task } from "../domain";
import { DatabaseService } from "../infrastructure/database.service";

@Injectable()
export class TaskRepository {
  constructor(private readonly db: DatabaseService) {}

  async save(task: Task) {
    await this.db.query(
      `INSERT INTO tasks(id,company_id,project_id,title,description,status,assigned_agent_id)
       VALUES($1,$2,$3,$4,$5,$6,$7)
       ON CONFLICT(id) DO UPDATE SET status=EXCLUDED.status,assigned_agent_id=EXCLUDED.assigned_agent_id,description=EXCLUDED.description`,
      [task.id,task.companyId,task.projectId ?? null,task.title,task.description,task.status,task.assignedAgentId ?? null],
    );
    return task;
  }

  async findByCompany(companyId:string) {
    const r=await this.db.query("SELECT id,company_id AS \"companyId\",project_id AS \"projectId\",title,description,status,assigned_agent_id AS \"assignedAgentId\" FROM tasks WHERE company_id=$1 ORDER BY created_at DESC",[companyId]);
    return r.rows as Task[];
  }

  async find(id:string) {
    const r=await this.db.query("SELECT id,company_id AS \"companyId\",project_id AS \"projectId\",title,description,status,assigned_agent_id AS \"assignedAgentId\" FROM tasks WHERE id=$1",[id]);
    return r.rows[0] as Task | undefined;
  }
}