import {Injectable}from "@nestjs/common";
import {randomUUID}from "crypto";
import {DatabaseService}from "../infrastructure/database.service";

@Injectable()
export class ToolExecutionRepository{
 constructor(private db:DatabaseService){}

 async create(input:{companyId:string;agentId:string;action:string;resource?:string;arguments:Record<string,unknown>;status:string}){
  const id=randomUUID();
  const r=await this.db.query(`INSERT INTO tool_executions(id,company_id,agent_id,action,resource,arguments,status)
   VALUES($1,$2,$3,$4,$5,$6::jsonb,$7)
   RETURNING id,company_id AS "companyId",agent_id AS "agentId",action,resource,arguments,status,created_at AS "createdAt"`,
   [id,input.companyId,input.agentId,input.action,input.resource??null,JSON.stringify(input.arguments),input.status]);
  return r.rows[0];
 }

 async complete(id:string,status:string,result:unknown){
  const r=await this.db.query(`UPDATE tool_executions SET status=$1,result=$2::jsonb,completed_at=now()
   WHERE id=$3 AND status IN ('RUNNABLE','WAITING_FOR_HUMAN')
   RETURNING id,company_id AS "companyId",agent_id AS "agentId",action,resource,arguments,status,result,
             created_at AS "createdAt",completed_at AS "completedAt"`,
   [status,JSON.stringify(result),id]);
  if(!r.rows[0]) return null;
  return r.rows[0];
 }

 async get(id:string){
  const r=await this.db.query(`SELECT id,company_id AS "companyId",agent_id AS "agentId",action,resource,arguments,status,result,
    created_at AS "createdAt",completed_at AS "completedAt"
    FROM tool_executions WHERE id=$1`,[id]);
  return r.rows[0];
 }
}
