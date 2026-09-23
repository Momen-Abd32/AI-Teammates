import { Injectable } from "@nestjs/common";
import { DatabaseService } from "../infrastructure/database.service";

@Injectable()
export class ConversationRepository {
  constructor(private readonly db:DatabaseService) {}

  async create(companyId:string,employeeId:string,agentId:string,title="New conversation") {
    const r=await this.db.query(`INSERT INTO conversations(id,company_id,employee_id,agent_id,title) VALUES(gen_random_uuid(),$1,$2,$3,$4) RETURNING id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",title,created_at AS "createdAt",updated_at AS "updatedAt"`,[companyId,employeeId,agentId,title]);
    return r.rows[0];
  }
  async list(companyId:string,employeeId:string) {
    const r=await this.db.query(`SELECT id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",title,created_at AS "createdAt",updated_at AS "updatedAt" FROM conversations WHERE company_id=$1 AND employee_id=$2 ORDER BY updated_at DESC`,[companyId,employeeId]);
    return r.rows;
  }
  async findOwned(id:string,companyId:string,employeeId:string) {
    const r=await this.db.query(`SELECT id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",title,created_at AS "createdAt",updated_at AS "updatedAt" FROM conversations WHERE id=$1 AND company_id=$2 AND employee_id=$3`,[id,companyId,employeeId]);
    return r.rows[0] ?? null;
  }
  async updateTitle(conversationId:string,title:string) {\n    const r=await this.db.query(`UPDATE conversations SET title=$2,updated_at=now() WHERE id=$1 RETURNING id,company_id AS "companyId",employee_id AS "employeeId",agent_id AS "agentId",title,created_at AS "createdAt",updated_at AS "updatedAt"`,[conversationId,title]);\n    return r.rows[0] ?? null;\n  }\n\n  async addMessage(conversationId:string,sender:"USER"|"AGENT"|"SYSTEM",content:string) {
    const r=await this.db.query(`INSERT INTO conversation_messages(id,conversation_id,sender,content) VALUES(gen_random_uuid(),$1,$2,$3) RETURNING id,conversation_id AS "conversationId",sender,content,created_at AS "createdAt"`,[conversationId,sender,content]);
    await this.db.query("UPDATE conversations SET updated_at=now() WHERE id=$1",[conversationId]);
    return r.rows[0];
  }
  async messages(conversationId:string,limit=30) {
    const r=await this.db.query(`SELECT id,conversation_id AS "conversationId",sender,content,created_at AS "createdAt" FROM conversation_messages WHERE conversation_id=$1 ORDER BY created_at DESC LIMIT $2`,[conversationId,Math.min(Math.max(limit,1),100)]);
    return r.rows.reverse();
  }
}