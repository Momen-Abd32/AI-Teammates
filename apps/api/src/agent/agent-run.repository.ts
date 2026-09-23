import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";

export type AgentRunStatus = "RUNNING"|"WAITING_FOR_HUMAN"|"COMPLETED"|"REJECTED"|"FAILED"|"STEP_LIMIT_REACHED";
export type AgentRunResult = {tool:string;result:unknown};

@Injectable()
export class AgentRunRepository {
  constructor(private db:DatabaseService){}

  async create(input:{companyId:string;employeeId:string;agentId:string;conversationId?:string;message:string;maxSteps?:number}){
    const r=await this.db.query(`INSERT INTO agent_runs(id,company_id,employee_id,agent_id,conversation_id,message,max_steps)
      VALUES(gen_random_uuid(),$1,$2,$3,$4,$5,$6)
      RETURNING id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",
        conversation_id AS "conversationId",message,status,current_step AS "currentStep",max_steps AS "maxSteps",
        results,waiting_execution_id AS "waitingExecutionId",waiting_approval_id AS "waitingApprovalId",
        created_at AS "createdAt",updated_at AS "updatedAt",completed_at AS "completedAt"`,
      [input.companyId,input.employeeId,input.agentId,input.conversationId??null,input.message,input.maxSteps??5]);
    return r.rows[0];
  }

  async get(id:string){
    const r=await this.db.query(`SELECT id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",
      conversation_id AS "conversationId",message,status,current_step AS "currentStep",max_steps AS "maxSteps",
      results,waiting_execution_id AS "waitingExecutionId",waiting_approval_id AS "waitingApprovalId",
      created_at AS "createdAt",updated_at AS "updatedAt",completed_at AS "completedAt"
      FROM agent_runs WHERE id=$1`,[id]);
    return r.rows[0] ?? null;
  }

  async findWaitingByExecution(executionId:string){
    const r=await this.db.query(`SELECT id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",
      conversation_id AS "conversationId",message,status,current_step AS "currentStep",max_steps AS "maxSteps",
      results,waiting_execution_id AS "waitingExecutionId",waiting_approval_id AS "waitingApprovalId",
      created_at AS "createdAt",updated_at AS "updatedAt",completed_at AS "completedAt"
      FROM agent_runs WHERE waiting_execution_id=$1 AND status='WAITING_FOR_HUMAN' LIMIT 1`,[executionId]);
    return r.rows[0] ?? null;
  }

  async update(id:string,input:{status?:AgentRunStatus;currentStep?:number;results?:AgentRunResult[];waitingExecutionId?:string|null;waitingApprovalId?:string|null;completed?:boolean}){
    const r=await this.db.query(`UPDATE agent_runs SET
      status=COALESCE($2,status),
      current_step=COALESCE($3,current_step),
      results=COALESCE($4::jsonb,results),
      waiting_execution_id=$5,
      waiting_approval_id=$6,
      updated_at=now(),
      completed_at=CASE WHEN $7 THEN now() ELSE completed_at END
      WHERE id=$1
      RETURNING id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",
        conversation_id AS "conversationId",message,status,current_step AS "currentStep",max_steps AS "maxSteps",
        results,waiting_execution_id AS "waitingExecutionId",waiting_approval_id AS "waitingApprovalId",
        created_at AS "createdAt",updated_at AS "updatedAt",completed_at AS "completedAt"`,
      [id,input.status??null,input.currentStep??null,input.results?JSON.stringify(input.results):null,input.waitingExecutionId??null,input.waitingApprovalId??null,input.completed??false]);
    return r.rows[0] ?? null;
  }
}
