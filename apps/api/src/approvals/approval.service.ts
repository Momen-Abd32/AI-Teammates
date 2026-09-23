import { Injectable, NotFoundException } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../infrastructure/database.service";
import { ActivityEventService } from "../activity/activity.event.service";
import { OrganizationService } from "../organization/organization.service";

export type Approval = {
  id:string; companyId:string; agentId:string; taskId?:string; executionId?:string;
  action:string; reason:string; status:"PENDING"|"APPROVED"|"REJECTED"; decidedBy?:string;
};

@Injectable()
export class ApprovalService {
  constructor(private db:DatabaseService,private activity:ActivityEventService,private org:OrganizationService) {}

  async request(input:Omit<Approval,"id"|"status">) {
    const id=randomUUID();
    const r=await this.db.query(
      `INSERT INTO approvals(id,company_id,agent_id,task_id,execution_id,action,reason,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING')
       RETURNING id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",execution_id AS "executionId",action,reason,status,decided_by AS "decidedBy"`,
      [id,input.companyId,input.agentId,input.taskId ?? null,input.executionId ?? null,input.action,input.reason],
    );
    const approval=r.rows[0];
    const agents=await this.org.agents(approval.companyId);
    const agent=agents.find(item=>item.id===approval.agentId);
    if(agent){
      await this.activity.publish({
        type:"approval.required",
        companyId:approval.companyId,
        employeeId:agent.employeeId,
        agentId:approval.agentId,
        message:`Approval required: ${approval.action}`,
      });
    }
    return approval;
  }

  async list(companyId:string) {
    const r=await this.db.query(
      `SELECT id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",execution_id AS "executionId",
              action,reason,status,decided_by AS "decidedBy"
       FROM approvals WHERE company_id=$1 ORDER BY created_at DESC`,
      [companyId],
    );
    return r.rows;
  }

  async find(id:string,companyId:string) {
    const r=await this.db.query(
      `SELECT id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",execution_id AS "executionId",
              action,reason,status,decided_by AS "decidedBy"
       FROM approvals WHERE id=$1 AND company_id=$2`,
      [id,companyId],
    );
    if(!r.rows[0]) throw new NotFoundException("Approval not found");
    return r.rows[0] as Approval;
  }

  async decide(id:string,decidedBy:string,status:"APPROVED"|"REJECTED",companyId?:string) {
    const r=await this.db.query(
      `UPDATE approvals SET status=$1,decided_by=$2,decided_at=now()
       WHERE id=$3 AND status='PENDING' AND ($4::uuid IS NULL OR company_id=$4::uuid)
       RETURNING id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",
                 action,reason,status,decided_by AS "decidedBy"`,
      [status,decidedBy,id,companyId ?? null],
    );
    if(!r.rows[0]) throw new NotFoundException("Approval not found");
    const approval=r.rows[0];
    await this.activity.publish({
      type:approval.status==="APPROVED"?"approval.approved":"approval.rejected",
      companyId:approval.companyId,
      employeeId:decidedBy,
      agentId:approval.agentId,
      message:`Approval ${approval.status.toLowerCase()}: ${approval.action}`,
    });
    return approval;
  }
}
