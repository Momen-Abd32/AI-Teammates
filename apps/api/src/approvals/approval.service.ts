import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../infrastructure/database.service";

export type Approval = {
  id:string; companyId:string; agentId:string; taskId?:string;
  action:string; reason:string; status:"PENDING"|"APPROVED"|"REJECTED"; decidedBy?:string;
};

@Injectable()
export class ApprovalService {
  constructor(private db:DatabaseService) {}

  async request(input:Omit<Approval,"id"|"status">) {
    const id=randomUUID();
    const r=await this.db.query(
      `INSERT INTO approvals(id,company_id,agent_id,task_id,action,reason,status)
       VALUES($1,$2,$3,$4,$5,$6,'PENDING')
       RETURNING id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",action,reason,status,decided_by AS "decidedBy"`,
      [id,input.companyId,input.agentId,input.taskId ?? null,input.action,input.reason],
    );
    return r.rows[0];
  }

  async list(companyId:string) {
    const r=await this.db.query(
      `SELECT id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",
              action,reason,status,decided_by AS "decidedBy"
       FROM approvals WHERE company_id=$1 ORDER BY created_at DESC`,
      [companyId],
    );
    return r.rows;
  }

  async decide(id:string,decidedBy:string,status:"APPROVED"|"REJECTED") {
    const r=await this.db.query(
      `UPDATE approvals SET status=$1,decided_by=$2,decided_at=now()
       WHERE id=$3
       RETURNING id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",
                 action,reason,status,decided_by AS "decidedBy"`,
      [status,decidedBy,id],
    );
    if(!r.rows[0]) throw new NotFoundException("Approval not found");
    return r.rows[0];
  }
}
