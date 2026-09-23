import { Global, Injectable } from "@nestjs/common";
import { randomUUID } from "crypto";
import { DatabaseService } from "../infrastructure/database.service";

export type AuditEvent = {
  id:string; companyId:string; actorId?:string; agentId?:string;
  action:string; resource?:string; metadata?:Record<string,unknown>; createdAt:string;
};

@Global()
@Injectable()
export class AuditService {
  constructor(private db:DatabaseService) {}

  async record(input:Omit<AuditEvent,"id"|"createdAt">) {
    const id=randomUUID();
    const createdAt=new Date().toISOString();
    await this.db.query(
      `INSERT INTO audit_logs(id,company_id,actor_id,agent_id,action,resource,metadata)
       VALUES($1,$2,$3,$4,$5,$6,$7::jsonb)`,
      [id,input.companyId,input.actorId ?? null,input.agentId ?? null,input.action,input.resource ?? null,JSON.stringify(input.metadata ?? {})],
    );
    return {...input,id,createdAt};
  }

  async list(companyId:string) {
    const r=await this.db.query(
      `SELECT id,company_id AS "companyId",actor_id AS "actorId",agent_id AS "agentId",
              action,resource,metadata,created_at AS "createdAt"
       FROM audit_logs WHERE company_id=$1 ORDER BY created_at DESC LIMIT 500`,
      [companyId],
    );
    return r.rows;
  }
}
