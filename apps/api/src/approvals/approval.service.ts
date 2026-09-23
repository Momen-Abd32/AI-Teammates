import { Injectable, NotFoundException, ForbiddenException } from "@nestjs/common";
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

  async request(input:Omit<Approval,"id"|"status">,requesterEmployeeId?:string) {
    const agents=await this.org.agents(input.companyId);
    const agent=agents.find(item=>item.id===input.agentId);
    if(!agent) throw new NotFoundException("Agent not found in company");
    if(requesterEmployeeId && agent.employeeId!==requesterEmployeeId) throw new ForbiddenException("Approval requester does not own the agent");
    const id=randomUUID();
    const r=await this.db.query(
      `INSERT INTO approvals(id,company_id,agent_id,task_id,execution_id,action,reason,status)
       VALUES($1,$2,$3,$4,$5,$6,$7,'PENDING')
       RETURNING id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",execution_id AS "executionId",action,reason,status,decided_by AS "decidedBy"`,
      [id,input.companyId,input.agentId,input.taskId ?? null,input.executionId ?? null,input.action,input.reason],
    );
    const approval=r.rows[0];
    await this.activity.publish({
      type:"approval.required",
      companyId:approval.companyId,
      employeeId:agent.employeeId,
      agentId:approval.agentId,
      message:`Approval required: ${approval.action}`,
    });
    return approval;
  }

  async list(companyId:string,requesterEmployeeId:string,requesterRole:string) {
    if(requesterRole==="admin"){
      const r=await this.db.query(
        `SELECT id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",execution_id AS "executionId",
                action,reason,status,decided_by AS "decidedBy"
         FROM approvals WHERE company_id=$1 ORDER BY created_at DESC`,
        [companyId],
      );
      return r.rows;
    }

    const r=await this.db.query(
      `SELECT a.id,a.company_id AS "companyId",a.agent_id AS "agentId",a.task_id AS "taskId",
              a.execution_id AS "executionId",a.action,a.reason,a.status,a.decided_by AS "decidedBy"
       FROM approvals a
       JOIN agents ag ON ag.id=a.agent_id AND ag.company_id=a.company_id
       WHERE a.company_id=$1 AND ag.employee_id=$2
       ORDER BY a.created_at DESC`,
      [companyId,requesterEmployeeId],
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
    const context=await this.db.query(
      `SELECT a.company_id AS "companyId",a.agent_id AS "agentId",ag.employee_id AS "agentOwnerId",
              e.role AS "deciderRole"
       FROM approvals a
       JOIN agents ag ON ag.id=a.agent_id AND ag.company_id=a.company_id
       JOIN employees e ON e.id=$2 AND e.company_id=a.company_id
       WHERE a.id=$1 AND a.status='PENDING' AND ($3::uuid IS NULL OR a.company_id=$3::uuid)`,
      [id,decidedBy,companyId ?? null],
    );
    const row=context.rows[0];
    if(!row) throw new NotFoundException("Approval not found");
    if(row.deciderRole!=="admin" && row.agentOwnerId!==decidedBy) {
      throw new ForbiddenException("Only the agent owner or a company admin can decide this approval");
    }

    const r=await this.db.query(
      `UPDATE approvals SET status=$1,decided_by=$2,decided_at=now()
       WHERE id=$3 AND status='PENDING' AND company_id=$4
       RETURNING id,company_id AS "companyId",agent_id AS "agentId",task_id AS "taskId",
                 action,reason,status,decided_by AS "decidedBy"`,
      [status,decidedBy,id,row.companyId],
    );
    if(!r.rows[0]) throw new NotFoundException("Approval was already decided");
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
